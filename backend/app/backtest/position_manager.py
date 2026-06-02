"""Trade lifecycle types, position state machine, and trade record creation."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from app.backtest.types import TakeProfitLevel

if TYPE_CHECKING:
    from app.models.candle import Candle
    from app.backtest.exit_conditions import CandleExit, PartialExit


@dataclass
class TPLevelState:
    """Runtime state for a TP level during backtest."""

    profit_pct: float
    close_pct: int
    price: float  # Calculated at entry
    triggered: bool = False


@dataclass
class Trade:
    """Represents a single trade with extended analytics."""

    entry_time: datetime
    entry_price: float
    exit_time: datetime
    exit_price: float
    side: str  # "long"
    pnl: float
    pnl_pct: float
    # Extended fields for trade details drawer
    qty: float
    sl_price_at_entry: Optional[float]
    tp_price_at_entry: Optional[float]
    exit_reason: str  # "tp", "sl", "signal", "end_of_data"
    mae_usd: float  # Max Adverse Excursion in USD
    mae_pct: float  # MAE as percentage
    mfe_usd: float  # Max Favorable Excursion in USD
    mfe_pct: float  # MFE as percentage
    initial_risk_usd: Optional[float]  # Entry to SL distance * qty
    r_multiple: Optional[float]  # PnL / initial_risk
    peak_price: float  # Best price during trade (highest for long)
    peak_ts: datetime  # Timestamp of peak
    trough_price: float  # Worst price during trade (lowest for long)
    trough_ts: datetime  # Timestamp of trough
    duration_seconds: int
    # Transaction cost breakdown
    fee_cost_usd: float
    slippage_cost_usd: float
    spread_cost_usd: float
    total_cost_usd: float
    notional_usd: float  # Entry notional for what-if analysis


@dataclass(frozen=True)
class RiskConfig:
    """Per-position risk configuration consumed by PositionManager.enter().

    Account-blind: no equity reference. Realized PnL leaves as a return value.
    """

    take_profit_levels: list[TakeProfitLevel] | None
    stop_loss_pct: float | None
    max_drawdown_pct: float | None
    time_exit_bars: int | None
    trailing_stop_pct: float | None


def _create_trade(
    qty: float,
    exit_price_raw: float,
    exit_reason: str,
    entry_price: float,
    entry_time: datetime,
    exit_timestamp: datetime,
    sl_price: Optional[float],
    tp_levels: list[TPLevelState],
    peak_high: float,
    peak_high_ts: Optional[datetime],
    trough_low: float,
    trough_low_ts: Optional[datetime],
    slippage_rate: float,
    fee_rate: float,
    spread_rate: float,
) -> tuple[Trade, float]:
    """
    Create a Trade record and compute PnL.
    Returns (Trade, pnl) tuple.
    """
    effective_exit = exit_price_raw * (1 - slippage_rate) * (1 - fee_rate) * (1 - spread_rate / 2)
    pnl = (effective_exit - entry_price) * qty
    pnl_pct = ((effective_exit - entry_price) / entry_price) * 100

    # Compute excursion metrics
    mfe_pct = (peak_high - entry_price) / entry_price * 100
    mfe_usd = (peak_high - entry_price) * qty
    mae_pct = (trough_low - entry_price) / entry_price * 100
    mae_usd = (trough_low - entry_price) * qty

    # Compute R-multiple
    initial_risk_usd: Optional[float] = None
    r_multiple: Optional[float] = None
    if sl_price is not None and sl_price != entry_price:
        risk_per_unit = abs(entry_price - sl_price)
        initial_risk_usd = risk_per_unit * qty
        if initial_risk_usd > 0:
            r_multiple = pnl / initial_risk_usd

    duration_seconds = int((exit_timestamp - entry_time).total_seconds())

    # Calculate transaction cost breakdown
    notional_entry = entry_price / (1 + slippage_rate) / (1 + fee_rate) / (1 + spread_rate / 2) * qty
    notional_exit = exit_price_raw * qty

    fee_cost_usd = (notional_entry + notional_exit) * fee_rate
    slippage_cost_usd = (notional_entry + notional_exit) * slippage_rate
    spread_cost_usd = (notional_entry + notional_exit) * (spread_rate / 2)
    total_cost_usd = fee_cost_usd + slippage_cost_usd + spread_cost_usd

    tp_price_record = tp_levels[0].price if tp_levels else None

    trade = Trade(
        entry_time=entry_time,
        entry_price=entry_price,
        exit_time=exit_timestamp,
        exit_price=effective_exit,
        side="long",
        pnl=pnl,
        pnl_pct=pnl_pct,
        qty=qty,
        sl_price_at_entry=sl_price,
        tp_price_at_entry=tp_price_record,
        exit_reason=exit_reason,
        mae_usd=round(mae_usd, 2),
        mae_pct=round(mae_pct, 4),
        mfe_usd=round(mfe_usd, 2),
        mfe_pct=round(mfe_pct, 4),
        initial_risk_usd=(
            round(initial_risk_usd, 2) if initial_risk_usd else None
        ),
        r_multiple=round(r_multiple, 2) if r_multiple else None,
        peak_price=peak_high,
        peak_ts=peak_high_ts,
        trough_price=trough_low,
        trough_ts=trough_low_ts,
        duration_seconds=duration_seconds,
        fee_cost_usd=round(fee_cost_usd, 2),
        slippage_cost_usd=round(slippage_cost_usd, 2),
        spread_cost_usd=round(spread_cost_usd, 2),
        total_cost_usd=round(total_cost_usd, 2),
        notional_usd=round(notional_entry, 2),
    )
    return trade, pnl


class PositionManager:
    """Mutable single-owner state machine for one open position during a backtest.

    DELIBERATE EXCEPTION to the project immutability rule: per-candle state
    (excursion tracking, TP ladder triggers, bars counter) must be updated
    incrementally inside the inner loop. Creating a new immutable snapshot per
    candle would allocate O(n_candles) objects for data only meaningful at trade
    boundaries. The instance is private to the engine and never aliased
    externally, so hidden mutation is not a concern here.

    One instance is constructed with the three cost rates and reused across
    multiple trades; ``enter()`` resets all per-position state.
    """

    def __init__(
        self,
        fee_rate: float,
        slippage_rate: float,
        spread_rate: float,
    ) -> None:
        self._fee_rate = fee_rate
        self._slippage_rate = slippage_rate
        self._spread_rate = spread_rate
        self._is_open: bool = False
        self._entry_price: float = 0.0
        self._entry_time: Optional[datetime] = None
        self._entry_index: Optional[int] = None
        self._position_size: float = 0.0
        self._initial_qty: float = 0.0
        self._sl_price: Optional[float] = None
        self._tp_levels: list[TPLevelState] = []
        self._max_dd_threshold: Optional[float] = None
        self._time_exit_threshold: Optional[int] = None
        self._trailing_stop_threshold: Optional[float] = None
        self._peak_high: float = 0.0
        self._peak_high_ts: Optional[datetime] = None
        self._trough_low: float = float("inf")
        self._trough_low_ts: Optional[datetime] = None
        self._bars_in_trade: int = 0
        self._highest_close_since_entry: float = 0.0

    # ------------------------------------------------------------------
    # Public read-only accessors
    # ------------------------------------------------------------------

    @property
    def is_open(self) -> bool:
        return self._is_open

    @property
    def position_size(self) -> float:
        return self._position_size

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def enter(
        self,
        price: float,
        qty: float,
        timestamp: datetime,
        index: int,
        risk: RiskConfig,
    ) -> None:
        """Initialise a new position, resetting all prior per-position state."""
        self._entry_price = price
        self._entry_time = timestamp
        self._entry_index = index
        self._position_size = qty
        self._initial_qty = qty
        self._is_open = True

        # Excursion sentinels — update_excursions() sets real values on first call
        self._peak_high = 0.0
        self._peak_high_ts = None
        self._trough_low = float("inf")
        self._trough_low_ts = None
        self._bars_in_trade = 0
        self._highest_close_since_entry = 0.0

        # Build TP ladder
        self._tp_levels = []
        if risk.take_profit_levels:
            for lvl in risk.take_profit_levels:
                tp_price = price * (1 + lvl.profit_pct / 100)
                self._tp_levels.append(
                    TPLevelState(
                        profit_pct=lvl.profit_pct,
                        close_pct=lvl.close_pct,
                        price=tp_price,
                        triggered=False,
                    )
                )

        self._sl_price = (
            price * (1 - risk.stop_loss_pct / 100)
            if risk.stop_loss_pct is not None
            else None
        )
        self._max_dd_threshold = risk.max_drawdown_pct
        self._time_exit_threshold = risk.time_exit_bars
        self._trailing_stop_threshold = risk.trailing_stop_pct

    def update_excursions(self, candle: "Candle") -> None:
        """Update MFE/MAE excursions and per-candle position counters."""
        self._bars_in_trade += 1
        if candle.close > self._highest_close_since_entry:
            self._highest_close_since_entry = candle.close
        if candle.high > self._peak_high:
            self._peak_high = candle.high
            self._peak_high_ts = candle.timestamp
        if candle.low < self._trough_low:
            self._trough_low = candle.low
            self._trough_low_ts = candle.timestamp

    def check_exits(
        self,
        candle: "Candle",
        index: int,
        exit_signal: bool = False,
    ) -> "CandleExit":
        """Evaluate all exit conditions for the current candle.

        Applies the same-candle guard (``index > entry_index``). A full exit
        preempts the take-profit ladder — ``CandleExit.full is not None``
        guarantees ``CandleExit.partials == []``.
        """
        from app.backtest.exit_conditions import (
            EXIT_PRIORITY_SEQUENCE,
            CandleExit,
            PositionContext,
            apply_take_profit_ladder,
        )

        if self._entry_index is not None and index <= self._entry_index:
            return CandleExit(full=None, partials=[])

        ctx = PositionContext(
            candle=candle,
            entry_price=self._entry_price,
            sl_price=self._sl_price,
            highest_close_since_entry=self._highest_close_since_entry,
            bars_in_trade=self._bars_in_trade,
            tp_levels=self._tp_levels,
            position_size=self._position_size,
            initial_qty=self._initial_qty,
            trailing_stop_threshold=self._trailing_stop_threshold,
            max_dd_threshold=self._max_dd_threshold,
            time_exit_threshold=self._time_exit_threshold,
            exit_signal=exit_signal,
        )

        for condition in EXIT_PRIORITY_SEQUENCE:
            decision = condition.check(ctx)
            if decision is not None:
                return CandleExit(full=decision, partials=[])

        return CandleExit(full=None, partials=apply_take_profit_ladder(ctx))

    def apply_partial(self, partial: "PartialExit", timestamp: datetime) -> Trade:
        """Realise one TP partial exit, decrement size, mark level triggered."""
        trade, _ = _create_trade(
            qty=partial.qty,
            exit_price_raw=partial.exit_price_raw,
            exit_reason="tp",
            entry_price=self._entry_price,
            entry_time=self._entry_time,
            exit_timestamp=timestamp,
            sl_price=self._sl_price,
            tp_levels=self._tp_levels,
            peak_high=self._peak_high,
            peak_high_ts=self._peak_high_ts,
            trough_low=self._trough_low,
            trough_low_ts=self._trough_low_ts,
            slippage_rate=self._slippage_rate,
            fee_rate=self._fee_rate,
            spread_rate=self._spread_rate,
        )
        self._position_size -= partial.qty
        self._tp_levels[partial.level_index].triggered = True
        if self._position_size <= 0:
            self._reset()
        return trade

    def close(self, price: float, reason: str, timestamp: datetime) -> Trade:
        """Close the remaining position and return the realised Trade."""
        trade, _ = _create_trade(
            qty=self._position_size,
            exit_price_raw=price,
            exit_reason=reason,
            entry_price=self._entry_price,
            entry_time=self._entry_time,
            exit_timestamp=timestamp,
            sl_price=self._sl_price,
            tp_levels=self._tp_levels,
            peak_high=self._peak_high,
            peak_high_ts=self._peak_high_ts,
            trough_low=self._trough_low,
            trough_low_ts=self._trough_low_ts,
            slippage_rate=self._slippage_rate,
            fee_rate=self._fee_rate,
            spread_rate=self._spread_rate,
        )
        self._reset()
        return trade

    def unrealized_pnl(self, close_price: float) -> float:
        """Mark-to-market PnL for the open position."""
        return (close_price - self._entry_price) * self._position_size

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _reset(self) -> None:
        self._is_open = False
        self._position_size = 0.0
        self._initial_qty = 0.0
        self._entry_price = 0.0
        self._entry_time = None
        self._entry_index = None
        self._tp_levels = []
        self._sl_price = None
        self._peak_high = 0.0
        self._peak_high_ts = None
        self._trough_low = float("inf")
        self._trough_low_ts = None
        self._bars_in_trade = 0
        self._highest_close_since_entry = 0.0
