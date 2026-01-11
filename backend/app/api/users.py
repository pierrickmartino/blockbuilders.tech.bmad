from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from app.api.deps import get_current_user
from app.core.database import get_session
from app.core.plans import get_plan_limits
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.user import User
from app.schemas.auth import (
    ProfileResponse,
    SettingsResponse,
    UsageBundle,
    UsageItem,
    BacktestUsageItem,
    PlanResponse,
    UserUpdateRequest,
)

router = APIRouter(prefix="/users", tags=["users"])


def _build_profile_response(user: User, session: Session) -> ProfileResponse:
    """Build ProfileResponse with settings and usage data."""
    # Count active strategies
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

    # Get plan limits
    limits = get_plan_limits(user.plan_tier)

    return ProfileResponse(
        id=user.id,
        email=user.email,
        settings=SettingsResponse(
            default_fee_percent=user.default_fee_percent,
            default_slippage_percent=user.default_slippage_percent,
            timezone_preference=user.timezone_preference,
        ),
        usage=UsageBundle(
            strategies=UsageItem(used=strategies_count, limit=user.max_strategies),
            backtests_today=BacktestUsageItem(
                used=backtests_today,
                limit=user.max_backtests_per_day,
                resets_at_utc=tomorrow.isoformat(),
            ),
        ),
        plan=PlanResponse(
            tier=user.plan_tier,
            interval=user.plan_interval,
            status=user.subscription_status,
            max_strategies=limits["max_strategies"],
            max_backtests_per_day=limits["max_backtests_per_day"],
            max_history_days=limits["max_history_days"],
        ),
    )


@router.get("/me", response_model=ProfileResponse)
def get_me(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProfileResponse:
    """Get current user profile with settings and usage."""
    return _build_profile_response(user, session)


@router.put("/me", response_model=ProfileResponse)
def update_me(
    data: UserUpdateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProfileResponse:
    """Update user settings."""
    if data.default_fee_percent is not None:
        user.default_fee_percent = data.default_fee_percent
    if data.default_slippage_percent is not None:
        user.default_slippage_percent = data.default_slippage_percent
    if data.timezone_preference is not None:
        user.timezone_preference = data.timezone_preference
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)
    return _build_profile_response(user, session)
