"""Pure response builders for backtest endpoints — no Session, no I/O."""
from __future__ import annotations

from datetime import datetime, timezone

from app.backtest.narrative import generate_narrative
from app.models.backtest_run import BacktestRun
from app.schemas.backtest import (
    BacktestListItem,
    BacktestStatusResponse,
    BacktestSummary,
    CandleResponse,
    DataQualityMetrics,
    EntryExplanation,
    EquityCurvePoint,
    ExitExplanation,
    IndicatorSeries,
    PublicBacktestView,
    TradeDetail,
    TradeDetailResponse,
)


def _build_summary(run: BacktestRun) -> BacktestSummary | None:
    """Return None when run is not completed or total_return is None."""
    if run.status != "completed" or run.total_return is None:
        return None
    return BacktestSummary(
        initial_balance=run.initial_balance,
        final_balance=run.initial_balance * (1 + run.total_return / 100),
        total_return_pct=run.total_return,
        cagr_pct=run.cagr or 0.0,
        max_drawdown_pct=run.max_drawdown or 0.0,
        num_trades=run.num_trades or 0,
        win_rate_pct=run.win_rate or 0.0,
        benchmark_return_pct=run.benchmark_return or 0.0,
        alpha=run.alpha or 0.0,
        beta=run.beta or 0.0,
        sharpe_ratio=run.sharpe_ratio or 0.0,
        sortino_ratio=run.sortino_ratio or 0.0,
        calmar_ratio=run.calmar_ratio or 0.0,
        max_consecutive_losses=run.max_consecutive_losses or 0,
        gross_return_usd=run.gross_return_usd,
        gross_return_pct=run.gross_return_pct,
        total_fees_usd=run.total_fees_usd,
        total_slippage_usd=run.total_slippage_usd,
        total_spread_usd=run.total_spread_usd,
        total_costs_usd=run.total_costs_usd,
        cost_pct_gross_return=run.cost_pct_gross_return,
        avg_cost_per_trade_usd=run.avg_cost_per_trade_usd,
    )


def build_status_response(
    run: BacktestRun,
    *,
    strategy_version_number: int,
    data_quality: DataQualityMetrics | None,
    narrative: str | None,
) -> BacktestStatusResponse:
    summary = _build_summary(run)
    return BacktestStatusResponse(
        run_id=run.id,
        strategy_id=run.strategy_id,
        strategy_version_id=run.strategy_version_id,
        strategy_version_number=strategy_version_number,
        status=run.status,
        asset=run.asset,
        timeframe=run.timeframe,
        date_from=run.date_from,
        date_to=run.date_to,
        triggered_by=run.triggered_by,
        batch_id=run.batch_id,
        period_key=run.period_key,
        summary=summary,
        narrative=narrative,
        error_message=run.error_message,
        data_quality=data_quality,
    )


def build_list_item(run: BacktestRun, now: datetime) -> BacktestListItem:
    def _utc(dt: datetime) -> datetime:
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)

    elapsed: float | None = None
    if run.started_at is not None:
        started = _utc(run.started_at)
        if run.status in ("completed", "failed"):
            updated = _utc(run.updated_at)
            elapsed = (updated - started).total_seconds() if updated > started else None
        elif run.status == "running":
            elapsed = (now - started).total_seconds()

    return BacktestListItem(
        run_id=run.id,
        strategy_id=run.strategy_id,
        status=run.status,
        asset=run.asset,
        timeframe=run.timeframe,
        date_from=run.date_from,
        date_to=run.date_to,
        triggered_by=run.triggered_by,
        total_return=run.total_return,
        created_at=run.created_at,
        period_key=run.period_key,
        batch_id=run.batch_id,
        max_drawdown=run.max_drawdown,
        sharpe_ratio=run.sharpe_ratio,
        elapsed_seconds=elapsed,
    )


def build_trade_detail_response(
    run: BacktestRun,
    trade: TradeDetail,
    candles: list[CandleResponse],
    explanation: tuple[EntryExplanation, ExitExplanation, list[IndicatorSeries]] | None = None,
    partial: bool = False,
) -> TradeDetailResponse:
    if explanation is not None:
        entry_exp, exit_exp, indicators = explanation
        return TradeDetailResponse(
            trade=trade,
            candles=candles,
            asset=run.asset,
            timeframe=run.timeframe,
            entry_explanation=entry_exp,
            exit_explanation=exit_exp,
            indicator_series=indicators,
            explanation_partial=False,
        )

    return TradeDetailResponse(
        trade=trade,
        candles=candles,
        asset=run.asset,
        timeframe=run.timeframe,
        explanation_partial=partial,
    )


def build_public_view(
    run: BacktestRun, equity_curve: list[EquityCurvePoint]
) -> PublicBacktestView:
    summary = _build_summary(run)
    assert summary is not None, "build_public_view requires a completed run with total_return set"
    return PublicBacktestView(
        asset=run.asset,
        timeframe=run.timeframe,
        date_from=run.date_from,
        date_to=run.date_to,
        summary=summary,
        equity_curve=equity_curve,
        narrative=generate_narrative(summary),
        fee_rate=run.fee_rate,
        slippage_rate=run.slippage_rate,
        spread_rate=run.spread_rate,
    )
