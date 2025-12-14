from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select, func

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.user import User

router = APIRouter(prefix="/usage", tags=["usage"])


class UsageResponse(BaseModel):
    strategies_count: int
    strategies_limit: int
    backtests_today_count: int
    backtests_daily_limit: int
    backtests_reset_at: str


@router.get("/me", response_model=UsageResponse)
def get_my_usage(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> UsageResponse:
    """Get current user's usage counts and limits."""
    # Count active (non-archived) strategies
    strategies_count = session.exec(
        select(func.count(Strategy.id)).where(
            Strategy.user_id == user.id,
            Strategy.is_archived == False,  # noqa: E712
        )
    ).one()

    # Count today's backtests (UTC day)
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    backtests_today = session.exec(
        select(func.count(BacktestRun.id)).where(
            BacktestRun.user_id == user.id,
            BacktestRun.created_at >= today_start,
        )
    ).one()

    # Calculate reset time (midnight UTC tomorrow)
    tomorrow = today_start + timedelta(days=1)

    return UsageResponse(
        strategies_count=strategies_count,
        strategies_limit=user.max_strategies,
        backtests_today_count=backtests_today,
        backtests_daily_limit=user.max_backtests_per_day,
        backtests_reset_at=tomorrow.isoformat(),
    )
