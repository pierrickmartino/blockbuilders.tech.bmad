"""Core backtest simulation engine."""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import math

from app.models.candle import Candle
from app.backtest.interpreter import StrategySignals, TakeProfitLevel


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


@dataclass
class BacktestResult:
    """Complete backtest results."""

    initial_balance: float
    final_balance: float
    total_return_pct: float
    cagr_pct: float
    max_drawdown_pct: float
    num_trades: int
    win_rate_pct: float
    equity_curve: list[dict]  # [{timestamp, equity}, ...]
    trades: list[Trade]


def run_backtest(
    candles: list[Candle],
    signals: StrategySignals,
    initial_balance: float,
    fee_rate: float,
    slippage_rate: float,
) -> BacktestResult:
    """
    Simulate trading over candles using signals.
    Returns complete backtest results.
    """
    if not candles:
        return BacktestResult(
            initial_balance=initial_balance,
            final_balance=initial_balance,
            total_return_pct=0.0,
            cagr_pct=0.0,
            max_drawdown_pct=0.0,
            num_trades=0,
            win_rate_pct=0.0,
            equity_curve=[],
            trades=[],
        )

    equity = initial_balance
    position_open = False
    position_size = 0.0  # Current remaining units held
    initial_qty = 0.0  # Initial position size (for TP ladder % calculations)
    entry_price = 0.0
    entry_time: Optional[datetime] = None

    # TP ladder levels (with prices and triggered flags)
    tp_levels: list[TPLevelState] = []
    sl_price: Optional[float] = None
    max_dd_threshold: Optional[float] = signals.max_drawdown_pct

    # Excursion tracking for current position
    peak_high: float = 0.0  # Highest high during position (for MFE in long)
    peak_high_ts: Optional[datetime] = None
    trough_low: float = float("inf")  # Lowest low during position (for MAE in long)
    trough_low_ts: Optional[datetime] = None

    equity_curve: list[dict] = []
    trades: list[Trade] = []
    peak_equity = initial_balance
    max_drawdown = 0.0

    n = len(candles)

    for i in range(n):
        candle = candles[i]
        entry_signal = signals.entry_long[i] if i < len(signals.entry_long) else False
        exit_signal = signals.exit_long[i] if i < len(signals.exit_long) else False

        # Helper to record a trade (full or partial exit)
        def record_trade(qty: float, exit_price_raw: float, exit_reason: str) -> float:
            """Record a trade and return the PnL."""
            nonlocal equity
            effective_exit = exit_price_raw * (1 - slippage_rate) * (1 - fee_rate)
            pnl = (effective_exit - entry_price) * qty
            pnl_pct = ((effective_exit - entry_price) / entry_price) * 100
            equity += pnl

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

            duration_seconds = int((candle.timestamp - entry_time).total_seconds())

            # TP price for record: first level's price if available
            tp_price_record = tp_levels[0].price if tp_levels else None

            trades.append(
                Trade(
                    entry_time=entry_time,
                    entry_price=entry_price,
                    exit_time=candle.timestamp,
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
                )
            )
            return pnl

        # If in position, check for exits
        if position_open:
            # Track excursions on this candle
            if candle.high > peak_high:
                peak_high = candle.high
                peak_high_ts = candle.timestamp
            if candle.low < trough_low:
                trough_low = candle.low
                trough_low_ts = candle.timestamp

            full_exit = False
            exit_price_raw: Optional[float] = None
            exit_reason = ""

            # Priority 1: Check Stop Loss (full exit)
            if sl_price is not None and candle.low <= sl_price:
                exit_price_raw = sl_price
                exit_reason = "sl"
                full_exit = True

            # Priority 2: Check Max Drawdown (full exit) - check after MTM
            # We'll do this check after equity update section below

            # Priority 3: Check TP levels (partial exits, in ascending order)
            if not full_exit and tp_levels:
                # Sort by profit_pct ascending and process
                for level in sorted(tp_levels, key=lambda x: x.profit_pct):
                    if not level.triggered and candle.high >= level.price:
                        # Calculate qty to close
                        qty_to_close = min(
                            initial_qty * level.close_pct / 100,
                            position_size
                        )
                        if qty_to_close > 0:
                            record_trade(qty_to_close, level.price, "tp")
                            position_size -= qty_to_close
                            level.triggered = True

                        # Check if position fully closed
                        if position_size <= 0:
                            full_exit = True
                            break

            # Priority 4: Check signal exit (full exit of remaining)
            if not full_exit and exit_signal and position_size > 0:
                exit_price_raw = candle.close
                exit_reason = "signal"
                full_exit = True

            # Execute full exit if triggered by SL or signal
            if full_exit and position_size > 0 and exit_price_raw is not None:
                record_trade(position_size, exit_price_raw, exit_reason)
                position_size = 0.0

            # Reset position if fully closed
            if position_size <= 0:
                position_open = False
                position_size = 0.0
                initial_qty = 0.0
                entry_price = 0.0
                entry_time = None
                tp_levels = []
                sl_price = None
                peak_high = 0.0
                peak_high_ts = None
                trough_low = float("inf")
                trough_low_ts = None

        # If flat, check for entry on next candle
        # Entry signal on candle i means we enter at candle i+1 open
        if not position_open and entry_signal and i + 1 < n:
            next_candle = candles[i + 1]
            raw_entry_price = next_candle.open

            # Apply slippage and fees on entry
            effective_entry = raw_entry_price * (1 + slippage_rate) * (1 + fee_rate)

            # Calculate position size based on percentage of equity
            position_value = equity * (signals.position_size_pct / 100)
            position_size = position_value / effective_entry
            initial_qty = position_size  # Store initial for TP ladder calculations

            position_open = True
            entry_price = effective_entry
            entry_time = next_candle.timestamp

            # Initialize excursion tracking for this position
            peak_high = next_candle.high
            peak_high_ts = next_candle.timestamp
            trough_low = next_candle.low
            trough_low_ts = next_candle.timestamp

            # Set up TP levels with prices
            tp_levels = []
            if signals.take_profit_levels:
                for lvl in signals.take_profit_levels:
                    tp_price = effective_entry * (1 + lvl.profit_pct / 100)
                    tp_levels.append(TPLevelState(
                        profit_pct=lvl.profit_pct,
                        close_pct=lvl.close_pct,
                        price=tp_price,
                        triggered=False
                    ))

            # Set SL price
            if signals.stop_loss_pct is not None:
                sl_price = effective_entry * (1 - signals.stop_loss_pct / 100)
            else:
                sl_price = None

        # Record equity at end of candle
        # If in position, mark-to-market at close
        current_equity = equity
        if position_open and position_size > 0:
            unrealized_pnl = (candle.close - entry_price) * position_size
            current_equity = equity + unrealized_pnl

        equity_curve.append({
            "timestamp": candle.timestamp.isoformat(),
            "equity": round(current_equity, 2),
        })

        # Track drawdown
        if current_equity > peak_equity:
            peak_equity = current_equity
        drawdown = (peak_equity - current_equity) / peak_equity * 100
        if drawdown > max_drawdown:
            max_drawdown = drawdown

        # Max Drawdown exit check (trade-based, at candle close)
        # Differs from SL: SL triggers on candle low, Max DD evaluates at close
        if position_open and position_size > 0 and max_dd_threshold is not None:
            # Trade-based drawdown: loss from entry price to close price
            trade_drawdown = (entry_price - candle.close) / entry_price * 100
            if trade_drawdown >= max_dd_threshold:
                # Force close remaining position at candle close
                record_trade(position_size, candle.close, "max_dd")
                position_size = 0.0
                position_open = False
                initial_qty = 0.0
                entry_price = 0.0
                entry_time = None
                tp_levels = []
                sl_price = None
                peak_high = 0.0
                peak_high_ts = None
                trough_low = float("inf")
                trough_low_ts = None

    # Close any open position at final candle close
    if position_open and position_size > 0 and candles:
        final_candle = candles[-1]

        # Update excursions for final candle
        if final_candle.high > peak_high:
            peak_high = final_candle.high
            peak_high_ts = final_candle.timestamp
        if final_candle.low < trough_low:
            trough_low = final_candle.low
            trough_low_ts = final_candle.timestamp

        effective_exit = final_candle.close * (1 - slippage_rate) * (1 - fee_rate)
        pnl = (effective_exit - entry_price) * position_size
        pnl_pct = ((effective_exit - entry_price) / entry_price) * 100
        equity += pnl

        # Compute excursion metrics
        mfe_pct = (peak_high - entry_price) / entry_price * 100
        mfe_usd = (peak_high - entry_price) * position_size
        mae_pct = (trough_low - entry_price) / entry_price * 100
        mae_usd = (trough_low - entry_price) * position_size

        # Compute R-multiple
        eod_initial_risk_usd: Optional[float] = None
        eod_r_multiple: Optional[float] = None
        if sl_price is not None and sl_price != entry_price:
            risk_per_unit = abs(entry_price - sl_price)
            eod_initial_risk_usd = risk_per_unit * position_size
            if eod_initial_risk_usd > 0:
                eod_r_multiple = pnl / eod_initial_risk_usd

        # Duration
        duration_seconds = int((final_candle.timestamp - entry_time).total_seconds())

        # TP price for record
        tp_price_record = tp_levels[0].price if tp_levels else None

        trades.append(
            Trade(
                entry_time=entry_time,
                entry_price=entry_price,
                exit_time=final_candle.timestamp,
                exit_price=effective_exit,
                side="long",
                pnl=pnl,
                pnl_pct=pnl_pct,
                qty=position_size,
                sl_price_at_entry=sl_price,
                tp_price_at_entry=tp_price_record,
                exit_reason="end_of_data",
                mae_usd=round(mae_usd, 2),
                mae_pct=round(mae_pct, 4),
                mfe_usd=round(mfe_usd, 2),
                mfe_pct=round(mfe_pct, 4),
                initial_risk_usd=(
                    round(eod_initial_risk_usd, 2) if eod_initial_risk_usd else None
                ),
                r_multiple=round(eod_r_multiple, 2) if eod_r_multiple else None,
                peak_price=peak_high,
                peak_ts=peak_high_ts,
                trough_price=trough_low,
                trough_ts=trough_low_ts,
                duration_seconds=duration_seconds,
            )
        )

        # Update final equity in curve
        if equity_curve:
            equity_curve[-1]["equity"] = round(equity, 2)

    # Compute summary metrics
    final_balance = equity
    total_return_pct = ((final_balance - initial_balance) / initial_balance) * 100

    # CAGR
    if candles:
        days = (candles[-1].timestamp - candles[0].timestamp).days
        years = max(days / 365.25, 1 / 365.25)  # At least 1 day
        if final_balance > 0 and initial_balance > 0:
            cagr_pct = (math.pow(final_balance / initial_balance, 1 / years) - 1) * 100
        else:
            cagr_pct = 0.0
    else:
        cagr_pct = 0.0

    # Win rate
    num_trades = len(trades)
    winning_trades = sum(1 for t in trades if t.pnl > 0)
    win_rate_pct = (winning_trades / num_trades * 100) if num_trades > 0 else 0.0

    return BacktestResult(
        initial_balance=initial_balance,
        final_balance=round(final_balance, 2),
        total_return_pct=round(total_return_pct, 2),
        cagr_pct=round(cagr_pct, 2),
        max_drawdown_pct=round(max_drawdown, 2),
        num_trades=num_trades,
        win_rate_pct=round(win_rate_pct, 2),
        equity_curve=equity_curve,
        trades=trades,
    )
