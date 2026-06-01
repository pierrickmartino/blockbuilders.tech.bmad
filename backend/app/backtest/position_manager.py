"""Trade lifecycle types and trade record creation for the backtest engine."""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


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
