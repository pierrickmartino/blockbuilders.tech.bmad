"""Core backtest simulation engine."""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import math

from app.models.candle import Candle
from app.backtest.interpreter import StrategySignals


@dataclass
class Trade:
    """Represents a single trade."""

    entry_time: datetime
    entry_price: float
    exit_time: datetime
    exit_price: float
    side: str  # "long"
    pnl: float
    pnl_pct: float


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
    position_size = 0.0  # Number of units held
    entry_price = 0.0
    entry_time: Optional[datetime] = None

    # TP/SL prices
    tp_price: Optional[float] = None
    sl_price: Optional[float] = None

    equity_curve: list[dict] = []
    trades: list[Trade] = []
    peak_equity = initial_balance
    max_drawdown = 0.0

    n = len(candles)

    for i in range(n):
        candle = candles[i]
        entry_signal = signals.entry_long[i] if i < len(signals.entry_long) else False
        exit_signal = signals.exit_long[i] if i < len(signals.exit_long) else False

        # If in position, check for exits
        if position_open:
            exit_price: Optional[float] = None
            exit_reason = ""

            # Check TP/SL on this candle's high/low
            if tp_price is not None and candle.high >= tp_price:
                exit_price = tp_price
                exit_reason = "tp"
            elif sl_price is not None and candle.low <= sl_price:
                exit_price = sl_price
                exit_reason = "sl"
            elif exit_signal:
                exit_price = candle.close
                exit_reason = "signal"

            if exit_price is not None:
                # Apply slippage and fees on exit
                effective_exit = exit_price * (1 - slippage_rate) * (1 - fee_rate)

                # Calculate PnL
                pnl = (effective_exit - entry_price) * position_size
                pnl_pct = ((effective_exit - entry_price) / entry_price) * 100

                equity += pnl

                trades.append(
                    Trade(
                        entry_time=entry_time,
                        entry_price=entry_price,
                        exit_time=candle.timestamp,
                        exit_price=effective_exit,
                        side="long",
                        pnl=pnl,
                        pnl_pct=pnl_pct,
                    )
                )

                # Reset position
                position_open = False
                position_size = 0.0
                entry_price = 0.0
                entry_time = None
                tp_price = None
                sl_price = None

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

            position_open = True
            entry_price = effective_entry
            entry_time = next_candle.timestamp

            # Set TP/SL prices
            if signals.take_profit_pct is not None:
                tp_price = effective_entry * (1 + signals.take_profit_pct / 100)
            else:
                tp_price = None

            if signals.stop_loss_pct is not None:
                sl_price = effective_entry * (1 - signals.stop_loss_pct / 100)
            else:
                sl_price = None

        # Record equity at end of candle
        # If in position, mark-to-market at close
        current_equity = equity
        if position_open:
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

    # Close any open position at final candle close
    if position_open and candles:
        final_candle = candles[-1]
        effective_exit = final_candle.close * (1 - slippage_rate) * (1 - fee_rate)
        pnl = (effective_exit - entry_price) * position_size
        pnl_pct = ((effective_exit - entry_price) / entry_price) * 100
        equity += pnl

        trades.append(
            Trade(
                entry_time=entry_time,
                entry_price=entry_price,
                exit_time=final_candle.timestamp,
                exit_price=effective_exit,
                side="long",
                pnl=pnl,
                pnl_pct=pnl_pct,
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
