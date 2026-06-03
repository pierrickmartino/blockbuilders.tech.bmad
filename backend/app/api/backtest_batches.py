"""API endpoints for batch backtest runs."""
import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID, uuid4

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.api.backtests import get_redis_queue, _build_status_response
from app.core.database import get_session
from app.core.logging import correlation_id_var
from app.core.plans import get_effective_limits
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.user import User
import app.services.backtest_service as backtest_service
from app.schemas.backtest import (
    BatchBacktestCreateRequest,
    BatchBacktestCreateResponse,
    BatchRunResult,
    BatchStatusResponse,
)

router = APIRouter(prefix="/backtests", tags=["backtests"])

PERIOD_DAYS: dict[str, int] = {
    "30d": 30, "60d": 60, "90d": 90, "120d": 120,
    "1y": 365, "2y": 730, "3y": 1095,
}
PREMIUM_ONLY_PERIODS = {"2y", "3y"}


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

    runs_sorted = sorted(runs, key=lambda r: PERIOD_DAYS.get(r.period_key or "", 0))

    return BatchStatusResponse(
        batch_id=batch_id,
        runs=[_build_status_response(r, session) for r in runs_sorted],
    )
