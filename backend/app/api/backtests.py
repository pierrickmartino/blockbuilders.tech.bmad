"""API endpoints for backtest runs."""
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis
from rq import Queue
from sqlmodel import Session, select, func

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_session
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.backtest.storage import download_json
from app.schemas.backtest import (
    BacktestCreateRequest,
    BacktestCreateResponse,
    BacktestListItem,
    BacktestStatusResponse,
    BacktestSummary,
    EquityCurvePoint,
    Trade,
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

    # Check daily backtest limit
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    today_count = session.exec(
        select(func.count(BacktestRun.id)).where(
            BacktestRun.user_id == user.id,
            BacktestRun.created_at >= today_start,
        )
    ).one()
    if today_count >= user.max_backtests_per_day:
        tomorrow = today_start + timedelta(days=1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily backtest limit reached ({user.max_backtests_per_day}). Resets at {tomorrow.isoformat()}.",
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
    else:
        fee_rate = fee_rate

    slippage_rate = data.slippage_rate
    if slippage_rate is None:
        slippage_rate = user.default_slippage_percent if user.default_slippage_percent else settings.default_slippage_rate
    else:
        slippage_rate = slippage_rate

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
        )

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
    )


@router.get("/{run_id}/trades", response_model=list[Trade])
def get_backtest_trades(
    run_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[Trade]:
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
            normalized.append(Trade(**t))

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
