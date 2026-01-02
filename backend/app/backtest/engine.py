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
) -> tuple[Trade, float]:
    """
    Create a Trade record and compute PnL.
    Returns (Trade, pnl) tuple.
    """
    effective_exit = exit_price_raw * (1 - slippage_rate) * (1 - fee_rate)
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

    # TP price for record: first level's price if available
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
    )
    return trade, pnl


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
    entry_index: Optional[int] = None

    # TP ladder levels (with prices and triggered flags)
    tp_levels: list[TPLevelState] = []
    sl_price: Optional[float] = None
    max_dd_threshold: Optional[float] = signals.max_drawdown_pct

    # New: State tracking for time_exit and trailing_stop
    bars_in_trade = 0
    highest_close_since_entry = 0.0
    time_exit_threshold: Optional[int] = signals.time_exit_bars
    trailing_stop_threshold: Optional[float] = signals.trailing_stop_pct

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

        # If in position, check for exits
        if position_open:
            # Avoid same-candle exits; wait at least one full candle after entry.
            can_exit = entry_index is None or i > entry_index

            # Increment bars counter
            bars_in_trade += 1

            # Update highest close for trailing stop
            if candle.close > highest_close_since_entry:
                highest_close_since_entry = candle.close

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

            # Priority 1: Stop Loss (full exit)
            if can_exit and sl_price is not None and candle.low <= sl_price:
                exit_price_raw = sl_price
                exit_reason = "sl"
                full_exit = True

            # Priority 2: Trailing Stop (full exit)
            if can_exit and not full_exit and trailing_stop_threshold is not None:
                trailing_stop_price = highest_close_since_entry * (1 - trailing_stop_threshold / 100)
                if candle.low <= trailing_stop_price:
                    exit_price_raw = trailing_stop_price
                    exit_reason = "trailing_stop"
                    full_exit = True

            # Priority 3: Max Drawdown (full exit)
            if can_exit and not full_exit and max_dd_threshold is not None:
                trade_drawdown = (entry_price - candle.close) / entry_price * 100
                if trade_drawdown >= max_dd_threshold:
                    exit_price_raw = candle.close
                    exit_reason = "max_dd"
                    full_exit = True

            # Priority 4: Time Exit (full exit)
            if can_exit and not full_exit and time_exit_threshold is not None:
                if bars_in_trade >= time_exit_threshold:
                    exit_price_raw = candle.close
                    exit_reason = "time_exit"
                    full_exit = True

            # Priority 5: Signal Exit (full exit of remaining)
            if can_exit and not full_exit and exit_signal and position_size > 0:
                exit_price_raw = candle.close
                exit_reason = "signal"
                full_exit = True

            # Priority 6: Take Profit (partial exits, in ascending order)
            if can_exit and not full_exit and tp_levels:
                # Sort by profit_pct ascending and process
                for level in sorted(tp_levels, key=lambda x: x.profit_pct):
                    if not level.triggered and candle.high >= level.price:
                        # Calculate qty to close
                        qty_to_close = min(
                            initial_qty * level.close_pct / 100,
                            position_size
                        )
                        if qty_to_close > 0:
                            trade, pnl = _create_trade(
                                qty=qty_to_close,
                                exit_price_raw=level.price,
                                exit_reason="tp",
                                entry_price=entry_price,
                                entry_time=entry_time,
                                exit_timestamp=candle.timestamp,
                                sl_price=sl_price,
                                tp_levels=tp_levels,
                                peak_high=peak_high,
                                peak_high_ts=peak_high_ts,
                                trough_low=trough_low,
                                trough_low_ts=trough_low_ts,
                                slippage_rate=slippage_rate,
                                fee_rate=fee_rate,
                            )
                            trades.append(trade)
                            equity += pnl
                            position_size -= qty_to_close
                            level.triggered = True

                        # Check if position fully closed
                        if position_size <= 0:
                            full_exit = True
                            break

            # Execute full exit if triggered by SL, trailing stop, max DD, time exit, or signal
            if full_exit and position_size > 0 and exit_price_raw is not None:
                trade, pnl = _create_trade(
                    qty=position_size,
                    exit_price_raw=exit_price_raw,
                    exit_reason=exit_reason,
                    entry_price=entry_price,
                    entry_time=entry_time,
                    exit_timestamp=candle.timestamp,
                    sl_price=sl_price,
                    tp_levels=tp_levels,
                    peak_high=peak_high,
                    peak_high_ts=peak_high_ts,
                    trough_low=trough_low,
                    trough_low_ts=trough_low_ts,
                    slippage_rate=slippage_rate,
                    fee_rate=fee_rate,
                )
                trades.append(trade)
                equity += pnl
                position_size = 0.0

            # Reset position if fully closed
            if position_size <= 0:
                position_open = False
                position_size = 0.0
                initial_qty = 0.0
                entry_price = 0.0
                entry_time = None
                entry_index = None
                tp_levels = []
                sl_price = None
                peak_high = 0.0
                peak_high_ts = None
                trough_low = float("inf")
                trough_low_ts = None
                bars_in_trade = 0
                highest_close_since_entry = 0.0

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
            entry_index = i + 1

            # Initialize excursion tracking for this position
            peak_high = next_candle.high
            peak_high_ts = next_candle.timestamp
            trough_low = next_candle.low
            trough_low_ts = next_candle.timestamp

            # Initialize new state for time_exit and trailing_stop
            bars_in_trade = 0
            highest_close_since_entry = next_candle.close

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

        trade, pnl = _create_trade(
            qty=position_size,
            exit_price_raw=final_candle.close,
            exit_reason="end_of_data",
            entry_price=entry_price,
            entry_time=entry_time,
            exit_timestamp=final_candle.timestamp,
            sl_price=sl_price,
            tp_levels=tp_levels,
            peak_high=peak_high,
            peak_high_ts=peak_high_ts,
            trough_low=trough_low,
            trough_low_ts=trough_low_ts,
            slippage_rate=slippage_rate,
            fee_rate=fee_rate,
        )
        trades.append(trade)
        equity += pnl

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


def compute_benchmark_curve(
    candles: list[Candle],
    initial_balance: float
) -> list[dict]:
    """
    Compute buy-and-hold benchmark equity curve.
    Buy at first candle open, hold until last candle close.
    No fees, no slippage.
    """
    if not candles:
        return []

    first_open = candles[0].open
    equity_curve = []

    for candle in candles:
        benchmark_equity = initial_balance * (candle.close / first_open)
        equity_curve.append({
            "timestamp": candle.timestamp.isoformat(),
            "equity": round(benchmark_equity, 2),
        })

    return equity_curve


def compute_benchmark_metrics(
    strategy_equity: list[dict],
    benchmark_equity: list[dict],
    initial_balance: float
) -> tuple[float, float, float]:
    """
    Calculate benchmark return %, alpha, and beta.
    Returns: (benchmark_return_pct, alpha, beta)
    """
    if not benchmark_equity or not strategy_equity:
        return 0.0, 0.0, 0.0

    # Benchmark return
    final_benchmark = benchmark_equity[-1]["equity"]
    benchmark_return_pct = ((final_benchmark - initial_balance) / initial_balance) * 100

    # Strategy return (from equity curve, not BacktestResult to be consistent)
    final_strategy = strategy_equity[-1]["equity"]
    strategy_return_pct = ((final_strategy - initial_balance) / initial_balance) * 100

    # Alpha
    alpha = strategy_return_pct - benchmark_return_pct

    # Beta calculation
    if len(strategy_equity) < 2 or len(benchmark_equity) < 2:
        beta = 0.0
    else:
        # Compute returns series
        strategy_returns = []
        benchmark_returns = []

        for i in range(1, min(len(strategy_equity), len(benchmark_equity))):
            s_ret = (strategy_equity[i]["equity"] / strategy_equity[i-1]["equity"]) - 1
            b_ret = (benchmark_equity[i]["equity"] / benchmark_equity[i-1]["equity"]) - 1
            strategy_returns.append(s_ret)
            benchmark_returns.append(b_ret)

        # Calculate covariance and variance
        n = len(strategy_returns)
        if n > 0:
            mean_s = sum(strategy_returns) / n
            mean_b = sum(benchmark_returns) / n

            covariance = sum((strategy_returns[i] - mean_s) * (benchmark_returns[i] - mean_b) for i in range(n)) / n
            variance = sum((benchmark_returns[i] - mean_b) ** 2 for i in range(n)) / n

            beta = covariance / variance if variance > 0 else 0.0
        else:
            beta = 0.0

    return round(benchmark_return_pct, 2), round(alpha, 2), round(beta, 2)
