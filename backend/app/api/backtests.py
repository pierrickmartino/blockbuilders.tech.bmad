"""API endpoints for backtest runs."""
import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID, uuid4

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, status
from redis import Redis
from rq import Queue
from sqlmodel import Session, select, func

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_session
from app.core.logging import correlation_id_var
from app.core.plans import get_effective_limits, get_plan_limits
from app.models.backtest_run import BacktestRun
from app.models.candle import Candle
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import User, UserTier
import app.services.backtest_service as backtest_service
import app.services.backtest_responses as _backtest_responses
import app.services.backtest_sharing as _backtest_sharing
from app.backtest.data_quality import query_metrics_for_range, compute_completeness_metrics
from app.backtest.storage import download_json
from app.backtest.explanation import build_trade_explanation
from app.backtest.narrative import generate_narrative
from app.schemas.backtest import (
    BacktestCompareRequest,
    BacktestCompareResponse,
    BacktestCompareRun,
    BacktestCreateRequest,
    BacktestCreateResponse,
    BacktestListPage,
    BacktestStatusResponse,
    BatchBacktestCreateRequest,
    BatchBacktestCreateResponse,
    BatchRunResult,
    BatchStatusResponse,
    CandleResponse,
    DataCompletenessResponse,
    DataQualityMetrics,
    EquityCurvePoint,
    PublicBacktestView,
    ShareLinkCreateRequest,
    ShareLinkCreateResponse,
    TradeDetail,
    TradeDetailResponse,
)

router = APIRouter(prefix="/backtests", tags=["backtests"])


def get_redis_queue() -> Queue:
    """Get Redis queue for job enqueueing."""
    redis_conn = Redis.from_url(settings.redis_url)
    return Queue("default", connection=redis_conn)


# Period-to-days mapping for batch backtesting
PERIOD_DAYS: dict[str, int] = {
    "30d": 30, "60d": 60, "90d": 90, "120d": 120,
    "1y": 365, "2y": 730, "3y": 1095,
}
PREMIUM_ONLY_PERIODS = {"2y", "3y"}


def _build_status_response(
    run: BacktestRun, session: Session
) -> BacktestStatusResponse:
    """Fetch data-quality metrics and narrative, then delegate response shaping."""
    summary = _backtest_responses._build_summary(run)
    narrative = generate_narrative(summary) if summary is not None else None

    data_quality = None
    try:
        metrics_list = query_metrics_for_range(
            run.asset, run.timeframe, run.date_from, run.date_to, session,
        )
        if metrics_list:
            gap_percent_avg = sum(m.gap_percent for m in metrics_list) / len(metrics_list)
            outlier_count_total = sum(m.outlier_count for m in metrics_list)
            volume_consistency_avg = sum(m.volume_consistency for m in metrics_list) / len(metrics_list)
            has_issues = any(m.has_issues for m in metrics_list)
            issues_parts = []
            if gap_percent_avg > settings.data_quality_gap_threshold:
                issues_parts.append(f"{gap_percent_avg:.1f}% missing candles")
            if outlier_count_total > 0:
                issues_parts.append(f"{outlier_count_total} price outliers")
            if volume_consistency_avg < settings.data_quality_volume_threshold:
                issues_parts.append(f"{volume_consistency_avg:.1f}% volume consistency")
            data_quality = DataQualityMetrics(
                asset=run.asset,
                timeframe=run.timeframe,
                date_from=run.date_from,
                date_to=run.date_to,
                gap_percent=gap_percent_avg,
                outlier_count=outlier_count_total,
                volume_consistency=volume_consistency_avg,
                has_issues=has_issues,
                issues_description=", ".join(issues_parts) if issues_parts else "Data quality OK",
            )
    except Exception as e:
        logger.debug("Failed to fetch data quality metrics: %s", e)

    return _backtest_responses.build_status_response(
        run, data_quality=data_quality, narrative=narrative
    )


@router.post("/", response_model=BacktestCreateResponse, status_code=status.HTTP_201_CREATED)
def create_backtest(
    data: BacktestCreateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BacktestCreateResponse:
    """Create a new backtest run and enqueue it for processing."""
    strategy = session.exec(
        select(Strategy).where(
            Strategy.id == data.strategy_id,
            Strategy.user_id == user.id,
        )
    ).first()
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")

    # Force-refresh of cached OHLCV is restricted to grandfathered beta users.
    if data.force_refresh_prices and user.user_tier != UserTier.BETA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Force refresh prices is only available for Beta User — Grandfathered Perks Applied.",
        )

    use_credit = backtest_service.enforce_daily_limit(user, session)
    backtest_service.enforce_history_depth(user, data.date_from, data.date_to)
    version = backtest_service.latest_version(strategy, session)

    fee_rate, slippage_rate, spread_rate = backtest_service.resolve_rates(
        user, data.fee_rate, data.slippage_rate, data.spread_rate,
    )

    correlation_id = correlation_id_var.get("") or None
    run, job_spec = backtest_service.build_run(
        user, strategy, version, session,
        data.date_from, data.date_to,
        fee_rate, slippage_rate, spread_rate,
        correlation_id,
        force_refresh_prices=data.force_refresh_prices,
    )

    if use_credit:
        user.backtest_credit_balance -= 1
        session.add(user)

    session.commit()

    try:
        queue = get_redis_queue()
        queue.enqueue(
            "app.worker.jobs.run_backtest_job",
            job_spec.run_id,
            job_spec.force_refresh_prices,
            job_spec.correlation_id,
            job_timeout=300,
        )
        logger.info(
            "backtest_enqueued",
            extra={
                "run_id": job_spec.run_id,
                "strategy_id": str(strategy.id),
                "user_id": str(user.id),
                "asset": strategy.asset,
                "timeframe": strategy.timeframe,
                "batch_id": None,
                "period_key": None,
            },
        )
    except Exception:
        run.status = "failed"
        run.error_message = "Failed to queue backtest job"
        session.add(run)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue backtest job",
        )

    return BacktestCreateResponse(run_id=run.id, status=run.status)


@router.get("/data-quality", response_model=DataQualityMetrics)
def get_data_quality(
    asset: str = Query(..., description="Asset pair e.g. BTC/USDT"),
    timeframe: str = Query(..., description="Timeframe e.g. 1d or 4h"),
    date_from: str = Query(..., description="Start date (ISO 8601 format)"),
    date_to: str = Query(..., description="End date (ISO 8601 format)"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> DataQualityMetrics:
    """
    Get data quality metrics for specified asset/timeframe/date range.
    Aggregates daily metrics over the period.
    """
    # Parse datetime strings
    try:
        date_from_dt = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        date_to_dt = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
    except (ValueError, AttributeError) as e:
        logger.error(f"Failed to parse dates for data-quality endpoint: date_from={date_from}, date_to={date_to}, error={e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format. Use ISO 8601 format (e.g., 2025-01-31T00:00:00Z): {str(e)}",
        )

    # Validate date range
    if date_to_dt <= date_from_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_to must be after date_from",
        )

    # Query metrics for the date range
    metrics_list = query_metrics_for_range(
        asset,
        timeframe,
        date_from_dt,
        date_to_dt,
        session,
    )

    if not metrics_list:
        # No stored metrics available, return default values
        return DataQualityMetrics(
            asset=asset,
            timeframe=timeframe,
            date_from=date_from_dt,
            date_to=date_to_dt,
            gap_percent=0.0,
            outlier_count=0,
            volume_consistency=100.0,
            has_issues=False,
            issues_description="No quality data available yet",
        )

    # Aggregate metrics across days
    gap_percent_avg = sum(m.gap_percent for m in metrics_list) / len(metrics_list)
    outlier_count_total = sum(m.outlier_count for m in metrics_list)
    volume_consistency_avg = sum(m.volume_consistency for m in metrics_list) / len(metrics_list)
    has_issues = any(m.has_issues for m in metrics_list)

    # Generate issues description
    issues_parts = []
    if gap_percent_avg > settings.data_quality_gap_threshold:
        issues_parts.append(f"{gap_percent_avg:.1f}% missing candles")
    if outlier_count_total > 0:
        issues_parts.append(f"{outlier_count_total} price outliers")
    if volume_consistency_avg < settings.data_quality_volume_threshold:
        issues_parts.append(f"{volume_consistency_avg:.1f}% volume consistency")

    issues_description = ", ".join(issues_parts) if issues_parts else "Data quality OK"

    return DataQualityMetrics(
        asset=asset,
        timeframe=timeframe,
        date_from=date_from_dt,
        date_to=date_to_dt,
        gap_percent=gap_percent_avg,
        outlier_count=outlier_count_total,
        volume_consistency=volume_consistency_avg,
        has_issues=has_issues,
        issues_description=issues_description,
    )


@router.get("/data-completeness", response_model=DataCompletenessResponse)
def get_data_completeness(
    asset: str = Query(..., description="Asset pair (e.g., BTC/USDT)"),
    timeframe: str = Query(..., description="Timeframe (e.g., 1d, 4h)"),
    session: Session = Depends(get_session),
) -> DataCompletenessResponse:
    """
    Get data completeness metrics and gap ranges for asset/timeframe.

    Returns coverage range, completeness percent, gap count, gap duration, and gap ranges.
    No authentication required - read-only public data.
    """
    metrics = compute_completeness_metrics(asset, timeframe, session)

    return DataCompletenessResponse(
        asset=asset,
        timeframe=timeframe,
        coverage_start=metrics["coverage_start"],
        coverage_end=metrics["coverage_end"],
        completeness_percent=metrics["completeness_percent"],
        gap_count=metrics["gap_count"],
        gap_total_hours=metrics["gap_total_hours"],
        gap_ranges=metrics["gap_ranges"],
    )


@router.post("/batch", response_model=BatchBacktestCreateResponse, status_code=status.HTTP_201_CREATED)
def create_batch_backtest(
    data: BatchBacktestCreateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BatchBacktestCreateResponse:
    """Create a batch of backtests across multiple periods and enqueue them."""
    strategy = session.exec(
        select(Strategy).where(
            Strategy.id == data.strategy_id,
            Strategy.user_id == user.id,
        )
    ).first()
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")

    version = backtest_service.latest_version(strategy, session)

    is_premium = user.plan_tier in ("premium", "pro")
    effective_limits = get_effective_limits(user.plan_tier, user.user_tier)

    fee_rate, slippage_rate, spread_rate = backtest_service.resolve_rates(
        user, data.fee_rate, data.slippage_rate, data.spread_rate,
    )

    batch_id: UUID | None = None
    now = datetime.now(timezone.utc)
    results: list[BatchRunResult] = []
    queued = 0
    correlation_id = correlation_id_var.get("") or None

    sorted_periods = sorted(data.periods, key=lambda p: PERIOD_DAYS.get(p, 0))

    for period in sorted_periods:
        days = PERIOD_DAYS.get(period)
        if days is None:
            results.append(BatchRunResult(period_key=period, status="skipped", skip_reason=f"Unknown period: {period}"))
            continue

        if period in PREMIUM_ONLY_PERIODS and not is_premium:
            results.append(BatchRunResult(period_key=period, status="skipped", skip_reason="Upgrade to Pro or Premium to access this period."))
            continue

        if days > effective_limits["max_history_days"]:
            results.append(BatchRunResult(period_key=period, status="skipped", skip_reason=f"Period exceeds your plan's {effective_limits['max_history_days']}-day history limit. Upgrade for longer history."))
            continue

        limit_state = backtest_service.check_daily_limit(user, session, projected_count=queued)
        if limit_state == backtest_service.LimitState.OVER_NO_CREDIT:
            results.append(BatchRunResult(period_key=period, status="skipped", skip_reason="Daily backtest limit reached. Purchase credits or try again tomorrow."))
            continue

        date_to = now
        date_from = now - timedelta(days=days)
        if batch_id is None:
            batch_id = uuid4()

        run, job_spec = backtest_service.build_run(
            user, strategy, version, session,
            date_from, date_to, fee_rate, slippage_rate, spread_rate,
            correlation_id,
            batch_id=batch_id, period_key=period,
        )

        if limit_state == backtest_service.LimitState.OVER_USING_CREDIT:
            user.backtest_credit_balance -= 1
            session.add(user)

        session.commit()

        try:
            queue = get_redis_queue()
            queue.enqueue(
                "app.worker.jobs.run_backtest_job",
                job_spec.run_id,
                job_spec.force_refresh_prices,
                job_spec.correlation_id,
                job_timeout=300,
            )
            logger.info(
                "backtest_enqueued",
                extra={
                    "run_id": job_spec.run_id,
                    "strategy_id": str(strategy.id),
                    "user_id": str(user.id),
                    "asset": strategy.asset,
                    "timeframe": strategy.timeframe,
                    "batch_id": str(batch_id),
                    "period_key": period,
                },
            )
        except Exception:
            run.status = "failed"
            run.error_message = "Failed to queue backtest job"
            session.add(run)
            session.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to queue backtest job",
            )

        queued += 1
        results.append(BatchRunResult(period_key=period, run_id=run.id, status="pending"))

    if queued == 0 and results:
        return BatchBacktestCreateResponse(batch_id=None, runs=results)

    return BatchBacktestCreateResponse(batch_id=batch_id, runs=results)


@router.get("/batch/{batch_id}", response_model=BatchStatusResponse)
def get_batch_status(
    batch_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BatchStatusResponse:
    """Get grouped status and results for all runs in a batch."""
    runs = session.exec(
        select(BacktestRun).where(
            BacktestRun.batch_id == batch_id,
            BacktestRun.user_id == user.id,
        )
    ).all()
    if not runs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    # Sort by period length (shortest first)
    runs_sorted = sorted(runs, key=lambda r: PERIOD_DAYS.get(r.period_key or "", 0))

    return BatchStatusResponse(
        batch_id=batch_id,
        runs=[_build_status_response(r, session) for r in runs_sorted],
    )


@router.get("/{run_id}", response_model=BacktestStatusResponse)
def get_backtest_status(
    run_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BacktestStatusResponse:
    """Get status and results of a backtest run."""
    run = session.exec(
        select(BacktestRun).where(
            BacktestRun.id == run_id,
            BacktestRun.user_id == user.id,
        )
    ).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest run not found",
        )

    return _build_status_response(run, session)


@router.get("/{run_id}/trades", response_model=list[TradeDetail])
def get_backtest_trades(
    run_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[TradeDetail]:
    """Get trades for a completed backtest run."""
    run = session.exec(
        select(BacktestRun).where(
            BacktestRun.id == run_id,
            BacktestRun.user_id == user.id,
        )
    ).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest run not found",
        )

    if run.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trades only available for completed runs",
        )

    if not run.trades_key:
        return []

    try:
        trades_data = download_json(run.trades_key)

        normalized = []
        for t in trades_data:
            # Calculate pnl_pct if missing (backward compatibility)
            if "pnl_pct" not in t:
                entry = t.get("entry_price")
                exit_price = t.get("exit_price")
                side = t.get("side", "long")
                if entry and exit_price:
                    if side == "short":
                        t["pnl_pct"] = ((entry - exit_price) / entry) * 100
                    else:
                        t["pnl_pct"] = ((exit_price - entry) / entry) * 100
                else:
                    t["pnl_pct"] = 0.0

            # Parse timestamps for TradeDetail
            entry_ts_str = t.get("entry_time")
            exit_ts_str = t.get("exit_time")
            entry_ts = datetime.fromisoformat(entry_ts_str.replace("Z", "+00:00"))
            exit_ts = datetime.fromisoformat(exit_ts_str.replace("Z", "+00:00"))

            # Build TradeDetail with defaults for missing fields
            trade_detail = TradeDetail(
                entry_time=entry_ts,
                entry_price=t.get("entry_price", 0),
                exit_time=exit_ts,
                exit_price=t.get("exit_price", 0),
                side=t.get("side", "long"),
                pnl=t.get("pnl", 0),
                pnl_pct=t.get("pnl_pct", 0),
                qty=t.get("qty", 0),
                sl_price_at_entry=t.get("sl_price_at_entry"),
                tp_price_at_entry=t.get("tp_price_at_entry"),
                exit_reason=t.get("exit_reason", "unknown"),
                mae_usd=t.get("mae_usd", 0),
                mae_pct=t.get("mae_pct", 0),
                mfe_usd=t.get("mfe_usd", 0),
                mfe_pct=t.get("mfe_pct", 0),
                initial_risk_usd=t.get("initial_risk_usd"),
                r_multiple=t.get("r_multiple"),
                peak_price=t.get("peak_price", 0),
                peak_ts=datetime.fromisoformat(
                    (t.get("peak_ts") or entry_ts_str).replace("Z", "+00:00")
                ),
                trough_price=t.get("trough_price", 0),
                trough_ts=datetime.fromisoformat(
                    (t.get("trough_ts") or entry_ts_str).replace("Z", "+00:00")
                ),
                duration_seconds=t.get("duration_seconds", 0),
                fee_cost_usd=t.get("fee_cost_usd"),
                slippage_cost_usd=t.get("slippage_cost_usd"),
                spread_cost_usd=t.get("spread_cost_usd"),
                total_cost_usd=t.get("total_cost_usd"),
                notional_usd=t.get("notional_usd"),
            )
            normalized.append(trade_detail)

        return normalized
    except (KeyError, TypeError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse trades data: {e}",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve trades data",
        )


@router.get("/{run_id}/equity-curve", response_model=list[EquityCurvePoint])
def get_backtest_equity_curve(
    run_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[EquityCurvePoint]:
    """Get equity curve for a completed backtest run."""
    run = session.exec(
        select(BacktestRun).where(
            BacktestRun.id == run_id,
            BacktestRun.user_id == user.id,
        )
    ).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest run not found",
        )

    if run.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Equity curve only available for completed runs",
        )

    if not run.equity_curve_key:
        return []

    try:
        data = download_json(run.equity_curve_key)
        return [EquityCurvePoint(**point) for point in data]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve equity curve data",
        )


@router.get("/{run_id}/benchmark-equity-curve", response_model=list[EquityCurvePoint])
def get_benchmark_equity_curve(
    run_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[EquityCurvePoint]:
    """Get benchmark equity curve for a completed backtest run."""
    run = session.exec(
        select(BacktestRun).where(
            BacktestRun.id == run_id,
            BacktestRun.user_id == user.id,
        )
    ).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest run not found",
        )

    if run.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Benchmark curve only available for completed runs",
        )

    if not run.benchmark_equity_curve_key:
        return []

    try:
        data = download_json(run.benchmark_equity_curve_key)
        return [EquityCurvePoint(**point) for point in data]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve benchmark equity curve data",
        )


@router.get("/", response_model=BacktestListPage)
def list_backtests(
    strategy_id: UUID | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BacktestListPage:
    """List backtest runs for the current user with total count."""
    base_filter = [BacktestRun.user_id == user.id]
    if strategy_id:
        base_filter.append(BacktestRun.strategy_id == strategy_id)

    total = session.exec(
        select(func.count(BacktestRun.id)).where(*base_filter)
    ).one()

    runs = session.exec(
        select(BacktestRun)
        .where(*base_filter)
        .order_by(BacktestRun.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    now = datetime.now(timezone.utc)
    items = [_backtest_responses.build_list_item(r, now) for r in runs]
    return BacktestListPage(items=items, total=total)


@router.get("/{run_id}/trades/{trade_idx}", response_model=TradeDetailResponse)
def get_trade_detail(
    run_id: UUID,
    trade_idx: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TradeDetailResponse:
    """Get detailed trade info with surrounding candles for chart."""
    # Verify run exists and belongs to user
    run = session.exec(
        select(BacktestRun).where(
            BacktestRun.id == run_id,
            BacktestRun.user_id == user.id,
        )
    ).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest run not found",
        )

    if run.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trade details only available for completed runs",
        )

    if not run.trades_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No trades data available",
        )

    # Download trades from S3
    try:
        trades_data = download_json(run.trades_key)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve trades data",
        )

    # Validate trade_idx
    if trade_idx < 0 or trade_idx >= len(trades_data):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trade index {trade_idx} out of range (0-{len(trades_data) - 1})",
        )

    trade_raw = trades_data[trade_idx]

    # Parse trade timestamps
    entry_ts_str = trade_raw.get("entry_time")
    exit_ts_str = trade_raw.get("exit_time")
    entry_ts = datetime.fromisoformat(entry_ts_str.replace("Z", "+00:00"))
    exit_ts = datetime.fromisoformat(exit_ts_str.replace("Z", "+00:00"))

    # Calculate chart window: 10 days before entry, 10 days after exit, min 90 days
    chart_start = entry_ts - timedelta(days=10)
    chart_end = exit_ts + timedelta(days=10)
    window_days = (chart_end - chart_start).days
    if window_days < 90:
        # Extend symmetrically around the trade midpoint
        needed = 90 - window_days
        chart_start -= timedelta(days=needed // 2)
        chart_end += timedelta(days=needed - needed // 2)

    # Fetch candles for the window
    candles = session.exec(
        select(Candle)
        .where(Candle.asset == run.asset)
        .where(Candle.timeframe == run.timeframe)
        .where(Candle.timestamp >= chart_start)
        .where(Candle.timestamp <= chart_end)
        .order_by(Candle.timestamp)
    ).all()

    candles_response = [
        CandleResponse(
            timestamp=c.timestamp,
            open=c.open,
            high=c.high,
            low=c.low,
            close=c.close,
        )
        for c in candles
    ]

    # Fetch strategy definition for explanation
    strategy_version = session.exec(
        select(StrategyVersion).where(StrategyVersion.id == run.strategy_version_id)
    ).first()

    if not strategy_version:
        logger.warning(
            "No strategy version found for run %s (strategy_version_id=%s)",
            run_id,
            run.strategy_version_id,
        )
        return _backtest_responses.build_trade_detail_response(
            run, trade_raw, candles_response, explanation=None
        )

    try:
        entry_idx = next(
            (i for i, c in enumerate(candles) if c.timestamp == entry_ts), None
        )
        exit_idx = next(
            (i for i, c in enumerate(candles) if c.timestamp == exit_ts), None
        )

        if entry_idx is None or exit_idx is None:
            logger.warning(f"Entry/exit not found in candle window for trade {trade_idx}")
            return _backtest_responses.build_trade_detail_response(
                run, trade_raw, candles_response, explanation=None
            )

        entry_exp, exit_exp, indicators = build_trade_explanation(
            definition=strategy_version.definition_json,
            candles=list(candles),
            trade_entry_idx=entry_idx,
            trade_exit_idx=exit_idx,
            exit_reason=trade_raw.get("exit_reason", "unknown"),
            sl_price=trade_raw.get("sl_price_at_entry"),
            tp_price=trade_raw.get("tp_price_at_entry"),
        )
        return _backtest_responses.build_trade_detail_response(
            run, trade_raw, candles_response, explanation=(entry_exp, exit_exp, indicators)
        )
    except Exception as e:
        logger.warning(f"Failed to build explanation for trade {trade_idx}: {e}")
        return _backtest_responses.build_trade_detail_response(
            run, trade_raw, candles_response, explanation=None, partial=True
        )


@router.post("/{run_id}/share-links", response_model=ShareLinkCreateResponse)
def create_share_link(
    run_id: UUID,
    data: ShareLinkCreateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ShareLinkCreateResponse:
    """Create a shareable link for a backtest run."""
    # Verify run exists and belongs to user
    run = session.exec(
        select(BacktestRun).where(
            BacktestRun.id == run_id,
            BacktestRun.user_id == user.id,
        )
    ).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest run not found",
        )

    if run.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only share completed backtest runs",
        )

    link = _backtest_sharing.create_share_link(run, data.expires_at, session)
    url = _backtest_sharing.build_share_url(link.token)
    return ShareLinkCreateResponse(url=url, token=link.token, expires_at=link.expires_at)


@router.get("/share/{token}", response_model=PublicBacktestView)
def get_shared_backtest(
    token: str,
    session: Session = Depends(get_session),
) -> PublicBacktestView:
    """Public, read-only view of shared backtest results."""
    link = _backtest_sharing.resolve_share_link(token, session)

    run = session.exec(
        select(BacktestRun).where(BacktestRun.id == link.backtest_run_id)
    ).first()

    if not run or run.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest results not available",
        )

    equity_curve = []
    if run.equity_curve_key:
        try:
            data_raw = download_json(run.equity_curve_key)
            equity_curve = [EquityCurvePoint(**point) for point in data_raw]
        except Exception as e:
            logger.warning(f"Failed to load equity curve for shared link: {e}")

    return _backtest_responses.build_public_view(run, equity_curve=equity_curve)


@router.post("/compare", response_model=BacktestCompareResponse)
def compare_backtests(
    data: BacktestCompareRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BacktestCompareResponse:
    """Compare 2-4 backtest runs with aligned equity curves and metrics."""

    # Validation
    if len(data.run_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least 2 backtest runs to compare.",
        )
    if len(data.run_ids) > 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 4 backtest runs can be compared at once.",
        )

    # Fetch all runs and verify ownership
    runs = []
    for run_id in data.run_ids:
        run = session.exec(
            select(BacktestRun).where(
                BacktestRun.id == run_id,
                BacktestRun.user_id == user.id,
            )
        ).first()
        if not run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backtest run {run_id} not found or not owned by you.",
            )
        if run.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Backtest run {run_id} is not completed. Only completed runs can be compared.",
            )
        runs.append(run)

    # Build comparison response
    comparison_runs = []
    for run in runs:
        # Fetch equity curve from S3
        equity_curve = []
        if run.equity_curve_key:
            try:
                equity_data = download_json(run.equity_curve_key)
                equity_curve = [
                    EquityCurvePoint(timestamp=point["timestamp"], equity=point["equity"])
                    for point in equity_data
                ]
            except Exception as e:
                logger.warning(f"Failed to load equity curve for run {run.id}: {e}")

        summary = _backtest_responses._build_summary(run)

        comparison_runs.append(
            BacktestCompareRun(
                run_id=run.id,
                asset=run.asset,
                timeframe=run.timeframe,
                date_from=run.date_from,
                date_to=run.date_to,
                created_at=run.created_at,
                summary=summary,
                equity_curve=equity_curve,
            )
        )

    return BacktestCompareResponse(runs=comparison_runs)
