"""Backtest pipeline — the pure deterministic assembly of a single run.

Turns a ValidatedStrategy + candles + BacktestParams into an immutable
RunOutcome with no DB, S3, Redis, or candle-fetching I/O. The worker shell
calls this function and owns all I/O and policy around it.

Documented in CONTEXT.md (terms: Backtest pipeline, RunOutcome).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.backtest.engine import (
    compute_benchmark_curve,
    compute_benchmark_metrics,
    run_backtest,
)
from app.backtest.errors import BacktestError
from app.backtest.interpreter import interpret_strategy
from app.backtest.trades_artifact import dump_trades
from app.backtest.types import ValidatedStrategy
from app.models.candle import Candle


@dataclass(frozen=True)
class BacktestParams:
    """Immutable cost and execution parameters for one backtest run."""

    initial_balance: float
    fee_rate: float
    slippage_rate: float
    spread_rate: float = 0.0002
    timeframe: str = "1d"


@dataclass(frozen=True)
class RunOutcome:
    """Immutable value returned by the Backtest pipeline.

    Carries every result metric, the benchmark metrics, the used_backup_data
    flag, and the three ready-to-upload artifact payloads. The worker copies
    metrics onto the run row and uploads the payloads; it assigns S3 keys after
    upload.
    """

    # Engine result metrics
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
    gross_return_usd: float
    gross_return_pct: float
    total_fees_usd: float
    total_slippage_usd: float
    total_spread_usd: float
    total_costs_usd: float
    cost_pct_gross_return: Optional[float]
    avg_cost_per_trade_usd: float

    # Benchmark metrics
    benchmark_return_pct: float
    alpha: float
    beta: float

    # Data-quality flag
    used_backup_data: bool

    # Ready-to-upload artifact payloads (not S3 keys)
    equity_curve_payload: list  # list[dict] — each {timestamp, equity}
    benchmark_curve_payload: list  # list[dict] — each {timestamp, equity}
    trades_payload: list  # list[dict] — serialized via dump_trades


def run_pipeline(
    strategy: ValidatedStrategy,
    candles: list[Candle],
    params: BacktestParams,
) -> RunOutcome:
    """Assemble and execute a complete backtest, returning an immutable RunOutcome.

    Pure: no database, object storage, queue, or candle-fetch I/O.
    Receives an already-validated strategy so validation failures are caught
    before any candle fetch in the worker.

    Raises BacktestError for empty candles.
    """
    if not candles:
        raise BacktestError(
            "No candles found for the specified period",
            "No price data available for the selected date range.",
        )

    used_backup_data = any(c.source != "cryptocompare" for c in candles)

    signals = interpret_strategy(strategy, candles)

    result = run_backtest(
        candles=candles,
        signals=signals,
        initial_balance=params.initial_balance,
        fee_rate=params.fee_rate,
        slippage_rate=params.slippage_rate,
        spread_rate=params.spread_rate,
        timeframe=params.timeframe,
    )

    benchmark_equity = compute_benchmark_curve(candles, params.initial_balance)
    benchmark_return_pct, alpha, beta = compute_benchmark_metrics(
        result.equity_curve,
        benchmark_equity,
        params.initial_balance,
    )

    trades_payload = dump_trades(result.trades)

    return RunOutcome(
        final_balance=result.final_balance,
        total_return_pct=result.total_return_pct,
        cagr_pct=result.cagr_pct,
        max_drawdown_pct=result.max_drawdown_pct,
        num_trades=result.num_trades,
        win_rate_pct=result.win_rate_pct,
        sharpe_ratio=result.sharpe_ratio,
        sortino_ratio=result.sortino_ratio,
        calmar_ratio=result.calmar_ratio,
        max_consecutive_losses=result.max_consecutive_losses,
        gross_return_usd=result.gross_return_usd,
        gross_return_pct=result.gross_return_pct,
        total_fees_usd=result.total_fees_usd,
        total_slippage_usd=result.total_slippage_usd,
        total_spread_usd=result.total_spread_usd,
        total_costs_usd=result.total_costs_usd,
        cost_pct_gross_return=result.cost_pct_gross_return,
        avg_cost_per_trade_usd=result.avg_cost_per_trade_usd,
        benchmark_return_pct=benchmark_return_pct,
        alpha=alpha,
        beta=beta,
        used_backup_data=used_backup_data,
        equity_curve_payload=result.equity_curve,
        benchmark_curve_payload=benchmark_equity,
        trades_payload=trades_payload,
    )
