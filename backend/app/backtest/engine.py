"""Core backtest simulation engine."""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import math

from app.models.candle import Candle
from app.backtest.interpreter import StrategySignals
from app.backtest.position_manager import TPLevelState, Trade, RiskConfig, PositionManager, _create_trade  # re-exported via __all__

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

    pm = PositionManager(fee_rate=fee_rate, slippage_rate=slippage_rate, spread_rate=spread_rate)

    equity = initial_balance
    equity_curve: list[dict] = []
    trades: list[Trade] = []
    peak_equity = initial_balance
    max_drawdown = 0.0

    n = len(candles)

    for i in range(n):
        candle = candles[i]
        entry_signal = signals.entry_long[i] if i < len(signals.entry_long) else False
        exit_signal = signals.exit_long[i] if i < len(signals.exit_long) else False

        if pm.is_open:
            pm.update_excursions(candle)
            candle_exit = pm.check_exits(candle, i, exit_signal)

            for partial in candle_exit.partials:
                trade = pm.apply_partial(partial, candle.timestamp)
                trades.append(trade)
                equity += trade.pnl
                if not pm.is_open:
                    break

            if candle_exit.full is not None and pm.is_open:
                trade = pm.close(candle_exit.full.exit_price_raw, candle_exit.full.reason, candle.timestamp)
                trades.append(trade)
                equity += trade.pnl

        # Entry signal on candle i means we enter at candle i+1 open
        if not pm.is_open and entry_signal and i + 1 < n:
            next_candle = candles[i + 1]
            effective_entry = next_candle.open * (1 + slippage_rate) * (1 + fee_rate) * (1 + spread_rate / 2)
            qty = equity * (signals.position_size_pct / 100) / effective_entry
            risk = RiskConfig(
                take_profit_levels=signals.take_profit_levels or None,
                stop_loss_pct=signals.stop_loss_pct,
                max_drawdown_pct=signals.max_drawdown_pct,
                time_exit_bars=signals.time_exit_bars,
                trailing_stop_pct=signals.trailing_stop_pct,
            )
            pm.enter(price=effective_entry, qty=qty, timestamp=next_candle.timestamp, index=i + 1, risk=risk)

        current_equity = equity
        if pm.is_open:
            current_equity = equity + pm.unrealized_pnl(candle.close)

        equity_curve.append({
            "timestamp": candle.timestamp.isoformat(),
            "equity": round(current_equity, 2),
        })

        if current_equity > peak_equity:
            peak_equity = current_equity
        drawdown = (peak_equity - current_equity) / peak_equity * 100
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    # Force-close any open position at end of data
    if pm.is_open and candles:
        final_candle = candles[-1]
        trade = pm.close(final_candle.close, "end_of_data", final_candle.timestamp)
        trades.append(trade)
        equity += trade.pnl
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
