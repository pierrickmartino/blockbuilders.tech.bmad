"""Core backtest simulation engine."""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import math

from app.models.candle import Candle
from app.backtest.interpreter import StrategySignals
from app.backtest.position_manager import TPLevelState, Trade, _create_trade  # re-exported via __all__
from app.backtest.exit_conditions import (
    EXIT_PRIORITY_SEQUENCE,
    PositionContext,
    apply_take_profit_ladder,
)

# Re-export so existing `from app.backtest.engine import TPLevelState / Trade / _create_trade` keep working.
__all__ = [
    "TPLevelState",
    "Trade",
    "_create_trade",
    "BacktestResult",
    "run_backtest",
    "compute_benchmark_curve",
    "compute_benchmark_metrics",
    "compute_risk_metrics",
]


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
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    max_consecutive_losses: int
    # Transaction cost breakdown
    gross_return_usd: float
    gross_return_pct: float
    total_fees_usd: float
    total_slippage_usd: float
    total_spread_usd: float
    total_costs_usd: float
    cost_pct_gross_return: Optional[float]
    avg_cost_per_trade_usd: float
    equity_curve: list[dict]  # [{timestamp, equity}, ...]
    trades: list[Trade]


def run_backtest(
    candles: list[Candle],
    signals: StrategySignals,
    initial_balance: float,
    fee_rate: float,
    slippage_rate: float,
    spread_rate: float = 0.0002,
    timeframe: str = "1d",
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
            sharpe_ratio=0.0,
            sortino_ratio=0.0,
            calmar_ratio=0.0,
            max_consecutive_losses=0,
            gross_return_usd=0.0,
            gross_return_pct=0.0,
            total_fees_usd=0.0,
            total_slippage_usd=0.0,
            total_spread_usd=0.0,
            total_costs_usd=0.0,
            cost_pct_gross_return=None,
            avg_cost_per_trade_usd=0.0,
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

            if can_exit:
                ctx = PositionContext(
                    candle=candle,
                    entry_price=entry_price,
                    sl_price=sl_price,
                    highest_close_since_entry=highest_close_since_entry,
                    bars_in_trade=bars_in_trade,
                    tp_levels=tp_levels,
                    position_size=position_size,
                    initial_qty=initial_qty,
                    trailing_stop_threshold=trailing_stop_threshold,
                    max_dd_threshold=max_dd_threshold,
                    time_exit_threshold=time_exit_threshold,
                    exit_signal=exit_signal,
                )

                # Iterate priority sequence; first match wins
                for condition in EXIT_PRIORITY_SEQUENCE:
                    decision = condition.check(ctx)
                    if decision is not None:
                        exit_price_raw = decision.exit_price_raw
                        exit_reason = decision.reason
                        full_exit = True
                        break

                # Take profit (partial exits) only if no full exit fired
                if not full_exit:
                    for partial in apply_take_profit_ladder(ctx):
                        trade, pnl = _create_trade(
                            qty=partial.qty,
                            exit_price_raw=partial.exit_price_raw,
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
                            spread_rate=spread_rate,
                        )
                        trades.append(trade)
                        equity += pnl
                        position_size -= partial.qty
                        tp_levels[partial.level_index].triggered = True
                        if position_size <= 0:
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
                    spread_rate=spread_rate,
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

            # Apply slippage, fees, and spread on entry
            effective_entry = raw_entry_price * (1 + slippage_rate) * (1 + fee_rate) * (1 + spread_rate / 2)

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
            spread_rate=spread_rate,
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

    # Compute risk metrics
    sharpe_ratio, sortino_ratio, calmar_ratio, max_consecutive_losses = compute_risk_metrics(
        equity_curve=equity_curve,
        trades=trades,
        timeframe=timeframe,
        cagr_pct=cagr_pct,
        max_drawdown_pct=max_drawdown,
    )

    # Compute transaction cost breakdown
    total_fees = sum(t.fee_cost_usd for t in trades)
    total_slippage = sum(t.slippage_cost_usd for t in trades)
    total_spread = sum(t.spread_cost_usd for t in trades)
    total_costs = total_fees + total_slippage + total_spread

    net_return_usd = final_balance - initial_balance
    gross_return_usd = net_return_usd + total_costs
    gross_return_pct = (gross_return_usd / initial_balance) * 100 if initial_balance > 0 else 0.0

    cost_pct_gross_return: Optional[float] = None
    if gross_return_usd > 0:
        cost_pct_gross_return = (total_costs / gross_return_usd) * 100

    avg_cost_per_trade = total_costs / num_trades if num_trades > 0 else 0.0

    return BacktestResult(
        initial_balance=initial_balance,
        final_balance=round(final_balance, 2),
        total_return_pct=round(total_return_pct, 2),
        cagr_pct=round(cagr_pct, 2),
        max_drawdown_pct=round(max_drawdown, 2),
        num_trades=num_trades,
        win_rate_pct=round(win_rate_pct, 2),
        sharpe_ratio=sharpe_ratio,
        sortino_ratio=sortino_ratio,
        calmar_ratio=calmar_ratio,
        max_consecutive_losses=max_consecutive_losses,
        gross_return_usd=round(gross_return_usd, 2),
        gross_return_pct=round(gross_return_pct, 2),
        total_fees_usd=round(total_fees, 2),
        total_slippage_usd=round(total_slippage, 2),
        total_spread_usd=round(total_spread, 2),
        total_costs_usd=round(total_costs, 2),
        cost_pct_gross_return=round(cost_pct_gross_return, 2) if cost_pct_gross_return is not None else None,
        avg_cost_per_trade_usd=round(avg_cost_per_trade, 2),
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


def compute_risk_metrics(
    equity_curve: list[dict],
    trades: list[Trade],
    timeframe: str,
    cagr_pct: float,
    max_drawdown_pct: float,
) -> tuple[float, float, float, int]:
    """
    Calculate risk-adjusted metrics.

    Returns: (sharpe_ratio, sortino_ratio, calmar_ratio, max_consecutive_losses)
    """
    # Timeframe to periods per year mapping
    periods_per_year = {
        "1h": 365.25 * 24,      # 8766 hours/year
        "4h": 365.25 * 6,       # 2191.5 periods/year
        "1d": 365.25,           # 365.25 days/year
    }

    annualization_factor = periods_per_year.get(timeframe, 365.25)

    # 1. Sharpe Ratio
    sharpe_ratio = 0.0
    if len(equity_curve) >= 2:
        returns = []
        for i in range(1, len(equity_curve)):
            prev_equity = equity_curve[i-1]["equity"]
            curr_equity = equity_curve[i]["equity"]
            if prev_equity > 0:
                ret = (curr_equity - prev_equity) / prev_equity
                returns.append(ret)

        if len(returns) > 0:
            mean_return = sum(returns) / len(returns)
            variance = sum((r - mean_return) ** 2 for r in returns) / len(returns)
            std_dev = variance ** 0.5

            if std_dev > 0:
                # Annualize: mean * periods, std * sqrt(periods)
                annualized_return = mean_return * annualization_factor
                annualized_std = std_dev * (annualization_factor ** 0.5)
                sharpe_ratio = annualized_return / annualized_std

    # 2. Sortino Ratio
    sortino_ratio = 0.0
    if len(equity_curve) >= 2:
        returns = []
        for i in range(1, len(equity_curve)):
            prev_equity = equity_curve[i-1]["equity"]
            curr_equity = equity_curve[i]["equity"]
            if prev_equity > 0:
                ret = (curr_equity - prev_equity) / prev_equity
                returns.append(ret)

        if len(returns) > 0:
            mean_return = sum(returns) / len(returns)
            # Downside deviation: only negative returns
            negative_returns = [r for r in returns if r < 0]

            if len(negative_returns) > 0:
                downside_variance = sum(r ** 2 for r in negative_returns) / len(returns)
                downside_dev = downside_variance ** 0.5

                if downside_dev > 0:
                    # Annualize
                    annualized_return = mean_return * annualization_factor
                    annualized_downside_dev = downside_dev * (annualization_factor ** 0.5)
                    sortino_ratio = annualized_return / annualized_downside_dev

    # 3. Calmar Ratio
    calmar_ratio = 0.0
    if max_drawdown_pct > 0:
        calmar_ratio = cagr_pct / max_drawdown_pct

    # 4. Max Consecutive Losses
    max_consecutive_losses = 0
    if len(trades) > 0:
        current_streak = 0
        for trade in trades:
            if trade.pnl < 0:
                current_streak += 1
                if current_streak > max_consecutive_losses:
                    max_consecutive_losses = current_streak
            else:
                current_streak = 0

    return (
        round(sharpe_ratio, 2),
        round(sortino_ratio, 2),
        round(calmar_ratio, 2),
        max_consecutive_losses,
    )
