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
from app.core.logging import correlation_id_var
from app.models.backtest_run import BacktestRun
from app.models.candle import Candle
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import User, UserTier
import app.services.backtest_service as backtest_service
import app.services.backtest_responses as _backtest_responses
import app.services.backtest_sharing as _backtest_sharing
import app.services.version_freezer as version_freezer
from app.backtest.data_quality import query_metrics_for_range
from app.backtest.storage import download_json
from app.backtest.explanation import build_trade_explanation
from app.backtest.narrative import generate_narrative
from app.schemas.backtest import (
    BacktestCreateRequest,
    BacktestCreateResponse,
    BacktestListPage,
    BacktestStatusResponse,
    CandleResponse,
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


def _build_status_response(
    run: BacktestRun, session: Session
) -> BacktestStatusResponse:
    """Fetch data-quality metrics and narrative, then delegate response shaping."""
    summary = _backtest_responses._build_summary(run)
    narrative = generate_narrative(summary) if summary is not None else None

    strategy_version = session.exec(
        select(StrategyVersion).where(StrategyVersion.id == run.strategy_version_id)
    ).first()
    strategy_version_number = strategy_version.version_number if strategy_version else 0

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
        run,
        strategy_version_number=strategy_version_number,
        data_quality=data_quality,
        narrative=narrative,
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
    version = version_freezer.freeze_for_backtest(strategy, session)

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
    base_filter = [
        BacktestRun.user_id == user.id,
        BacktestRun.triggered_by != "comparison",
    ]
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
