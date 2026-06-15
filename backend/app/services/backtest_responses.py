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
    trade_raw: dict,
    candles: list[CandleResponse],
    explanation: tuple[EntryExplanation, ExitExplanation, list[IndicatorSeries]] | None = None,
    partial: bool = False,
) -> TradeDetailResponse:
    entry_ts_str = trade_raw.get("entry_time")
    exit_ts_str = trade_raw.get("exit_time")
    entry_ts = datetime.fromisoformat(entry_ts_str.replace("Z", "+00:00"))
    exit_ts = datetime.fromisoformat(exit_ts_str.replace("Z", "+00:00"))

    trade = TradeDetail(
        entry_time=entry_ts,
        entry_price=trade_raw.get("entry_price", 0),
        exit_time=exit_ts,
        exit_price=trade_raw.get("exit_price", 0),
        side=trade_raw.get("side", "long"),
        pnl=trade_raw.get("pnl", 0),
        pnl_pct=trade_raw.get("pnl_pct", 0),
        qty=trade_raw.get("qty", 0),
        sl_price_at_entry=trade_raw.get("sl_price_at_entry"),
        tp_price_at_entry=trade_raw.get("tp_price_at_entry"),
        exit_reason=trade_raw.get("exit_reason", "unknown"),
        mae_usd=trade_raw.get("mae_usd", 0),
        mae_pct=trade_raw.get("mae_pct", 0),
        mfe_usd=trade_raw.get("mfe_usd", 0),
        mfe_pct=trade_raw.get("mfe_pct", 0),
        initial_risk_usd=trade_raw.get("initial_risk_usd"),
        r_multiple=trade_raw.get("r_multiple"),
        peak_price=trade_raw.get("peak_price", 0),
        peak_ts=datetime.fromisoformat(
            (trade_raw.get("peak_ts") or entry_ts_str).replace("Z", "+00:00")
        ),
        trough_price=trade_raw.get("trough_price", 0),
        trough_ts=datetime.fromisoformat(
            (trade_raw.get("trough_ts") or entry_ts_str).replace("Z", "+00:00")
        ),
        duration_seconds=trade_raw.get("duration_seconds", 0),
        fee_cost_usd=trade_raw.get("fee_cost_usd"),
        slippage_cost_usd=trade_raw.get("slippage_cost_usd"),
        spread_cost_usd=trade_raw.get("spread_cost_usd"),
        total_cost_usd=trade_raw.get("total_cost_usd"),
        notional_usd=trade_raw.get("notional_usd"),
    )

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
    )
