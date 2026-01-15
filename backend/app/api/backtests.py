"""API endpoints for backtest runs."""
import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, status
from redis import Redis
from rq import Queue
from sqlmodel import Session, select, func

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_session
from app.core.plans import get_plan_limits
from app.models.backtest_run import BacktestRun
from app.models.candle import Candle
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.backtest.data_quality import query_metrics_for_range, compute_completeness_metrics
from app.backtest.storage import download_json
from app.schemas.backtest import (
    BacktestCreateRequest,
    BacktestCreateResponse,
    BacktestListItem,
    BacktestStatusResponse,
    BacktestSummary,
    CandleResponse,
    DataCompletenessResponse,
    DataQualityMetrics,
    EquityCurvePoint,
    Trade,
    TradeDetail,
    TradeDetailResponse,
)

router = APIRouter(prefix="/backtests", tags=["backtests"])


def get_redis_queue() -> Queue:
    """Get Redis queue for job enqueueing."""
    redis_conn = Redis.from_url(settings.redis_url)
    return Queue("default", connection=redis_conn)


@router.post("/", response_model=BacktestCreateResponse, status_code=status.HTTP_201_CREATED)
def create_backtest(
    data: BacktestCreateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BacktestCreateResponse:
    """Create a new backtest run and enqueue it for processing."""
    # Verify strategy exists and belongs to user
    strategy = session.exec(
        select(Strategy).where(
            Strategy.id == data.strategy_id,
            Strategy.user_id == user.id,
        )
    ).first()
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )

    # Check daily backtest limit based on plan tier
    limits = get_plan_limits(user.plan_tier)
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    today_count = session.exec(
        select(func.count(BacktestRun.id)).where(
            BacktestRun.user_id == user.id,
            BacktestRun.created_at >= today_start,
        )
    ).one()
    use_credit = False
    if today_count >= limits["max_backtests_per_day"]:
        # Daily cap reached - require credits to proceed
        if user.backtest_credit_balance > 0:
            use_credit = True
        else:
            # No credits - create notification and reject
            existing_notification = session.exec(
                select(Notification).where(
                    Notification.user_id == user.id,
                    Notification.type == "usage_limit_reached",
                    Notification.is_read == False,  # noqa: E712
                    Notification.created_at >= today_start,
                )
            ).first()

            if not existing_notification:
                notification = Notification(
                    user_id=user.id,
                    type="usage_limit_reached",
                    title="Daily backtest limit reached",
                    body=f"You've reached your daily limit of {limits['max_backtests_per_day']} backtests. Purchase backtest credits or upgrade your plan.",
                )
                session.add(notification)
                session.commit()

            tomorrow = today_start + timedelta(days=1)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily backtest limit reached ({limits['max_backtests_per_day']}). Purchase credits or resets at {tomorrow.isoformat()}.",
            )

    # Check historical data depth limit based on plan tier
    date_range_days = (data.date_to - data.date_from).days
    if date_range_days > limits["max_history_days"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Date range exceeds your plan's historical data limit ({limits['max_history_days']} days). Upgrade to access longer history.",
        )

    # Get latest version
    latest_version = session.exec(
        select(StrategyVersion)
        .where(StrategyVersion.strategy_id == strategy.id)
        .order_by(StrategyVersion.version_number.desc())
    ).first()
    if not latest_version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Strategy has no saved versions",
        )

    # Determine fee and slippage rates
    fee_rate = data.fee_rate
    if fee_rate is None:
        fee_rate = user.default_fee_percent if user.default_fee_percent else settings.default_fee_rate

    slippage_rate = data.slippage_rate
    if slippage_rate is None:
        slippage_rate = user.default_slippage_percent if user.default_slippage_percent else settings.default_slippage_rate

    # Create backtest run record
    run = BacktestRun(
        user_id=user.id,
        strategy_id=strategy.id,
        strategy_version_id=latest_version.id,
        status="pending",
        asset=strategy.asset,
        timeframe=strategy.timeframe,
        date_from=data.date_from,
        date_to=data.date_to,
        initial_balance=settings.default_initial_balance,
        fee_rate=fee_rate,
        slippage_rate=slippage_rate,
    )
    session.add(run)
    session.commit()
    session.refresh(run)

    # Enqueue job
    try:
        queue = get_redis_queue()
        queue.enqueue(
            "app.worker.jobs.run_backtest_job",
            str(run.id),
            job_timeout=300,  # 5 minute timeout
        )
        if use_credit:
            user.backtest_credit_balance -= 1
            session.add(user)
            session.commit()
            logger.info(
                "User %s used backtest credit (balance: %s)",
                user.id,
                user.backtest_credit_balance,
            )
    except Exception as e:
        # Mark run as failed if enqueue fails
        run.status = "failed"
        run.error_message = "Failed to queue backtest job"
        session.add(run)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue backtest job",
        )

    return BacktestCreateResponse(run_id=run.id, status=run.status)


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

    # Build summary if completed
    summary = None
    if run.status == "completed" and run.total_return is not None:
        summary = BacktestSummary(
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
        )

    # Query data quality metrics for the run's period
    data_quality = None
    try:
        metrics_list = query_metrics_for_range(
            run.asset,
            run.timeframe,
            run.date_from,
            run.date_to,
            session,
        )
        if metrics_list:
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

            data_quality = DataQualityMetrics(
                asset=run.asset,
                timeframe=run.timeframe,
                date_from=run.date_from,
                date_to=run.date_to,
                gap_percent=gap_percent_avg,
                outlier_count=outlier_count_total,
                volume_consistency=volume_consistency_avg,
                has_issues=has_issues,
                issues_description=issues_description,
            )
    except Exception as e:
        # Data quality is optional, don't fail if unavailable
        logger.debug("Failed to fetch data quality metrics: %s", e)

    return BacktestStatusResponse(
        run_id=run.id,
        strategy_id=run.strategy_id,
        status=run.status,
        asset=run.asset,
        timeframe=run.timeframe,
        date_from=run.date_from,
        date_to=run.date_to,
        triggered_by=run.triggered_by,
        summary=summary,
        error_message=run.error_message,
        data_quality=data_quality,
    )


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


@router.get("/", response_model=list[BacktestListItem])
def list_backtests(
    strategy_id: UUID | None = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[BacktestListItem]:
    """List backtest runs for the current user."""
    query = select(BacktestRun).where(BacktestRun.user_id == user.id)

    if strategy_id:
        query = query.where(BacktestRun.strategy_id == strategy_id)

    query = query.order_by(BacktestRun.created_at.desc()).limit(50)
    runs = session.exec(query).all()

    return [
        BacktestListItem(
            run_id=r.id,
            strategy_id=r.strategy_id,
            status=r.status,
            asset=r.asset,
            timeframe=r.timeframe,
            date_from=r.date_from,
            date_to=r.date_to,
            triggered_by=r.triggered_by,
            total_return=r.total_return,
            created_at=r.created_at,
        )
        for r in runs
    ]


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

    # Build TradeDetail with defaults for old trades missing new fields
    trade_detail = TradeDetail(
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
    )

    return TradeDetailResponse(
        trade=trade_detail,
        candles=candles_response,
        asset=run.asset,
        timeframe=run.timeframe,
    )


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
    logger.info(f"data-quality called: asset={asset}, timeframe={timeframe}, date_from={date_from}, date_to={date_to}")

    # Parse datetime strings
    try:
        date_from_dt = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        date_to_dt = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
        logger.info(f"Parsed dates successfully: {date_from_dt} to {date_to_dt}")
    except (ValueError, AttributeError) as e:
        logger.error(f"Date parsing failed: {e}")
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
