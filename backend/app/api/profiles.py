from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from app.api.deps import get_current_user, get_session
from app.models.user import User
from app.models.strategy import Strategy
from app.models.backtest_run import BacktestRun
from app.schemas.profile import (
    PublicProfileResponse,
    ProfileSettingsResponse,
    ProfileUpdateRequest,
    PublishedStrategy,
    Contributions,
)
from app.services.badges import compute_badges

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/{handle}", response_model=PublicProfileResponse)
def get_public_profile(
    handle: str,
    session: Session = Depends(get_session),
) -> PublicProfileResponse:
    """Get public profile by handle."""
    # Find user by handle
    user = session.exec(
        select(User).where(User.handle == handle)
    ).first()

    if not user or not user.is_public:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Published strategies (if visible)
    published_strategies = None
    if user.show_strategies:
        strategies = session.exec(
            select(Strategy).where(
                Strategy.user_id == user.id,
                Strategy.is_published == True,
                Strategy.is_archived == False,
            )
        ).all()
        published_strategies = [
            PublishedStrategy(id=s.id, name=s.name) for s in strategies
        ]

    # Contributions (if visible) and counts for badges (if needed)
    contributions = None
    published_count = None
    backtests_count = None
    if user.show_contributions or user.show_badges:
        published_count = session.exec(
            select(func.count(Strategy.id)).where(
                Strategy.user_id == user.id,
                Strategy.is_published == True,
                Strategy.is_archived == False,
            )
        ).one()

        backtests_count = session.exec(
            select(func.count(BacktestRun.id)).where(
                BacktestRun.user_id == user.id,
                BacktestRun.status == "completed",
            )
        ).one()

    if user.show_contributions:
        contributions = Contributions(
            published_strategies=published_count,
            completed_backtests=backtests_count,
        )

    # Badges (if visible)
    badges = None
    if user.show_badges and published_count is not None and backtests_count is not None:
        badges = compute_badges(
            published_strategies_count=published_count,
            completed_backtests_count=backtests_count,
            follower_count=user.follower_count,
        )

    return PublicProfileResponse(
        handle=user.handle or "",
        display_name=user.display_name,
        bio=user.bio,
        follower_count=user.follower_count,
        published_strategies=published_strategies,
        contributions=contributions,
        badges=badges,
    )


@router.get("/me/settings", response_model=ProfileSettingsResponse)
def get_profile_settings(
    user: User = Depends(get_current_user),
) -> ProfileSettingsResponse:
    """Get current user's profile settings."""
    return ProfileSettingsResponse(
        is_public=user.is_public,
        handle=user.handle,
        display_name=user.display_name,
        bio=user.bio,
        show_strategies=user.show_strategies,
        show_contributions=user.show_contributions,
        show_badges=user.show_badges,
        follower_count=user.follower_count,
    )


@router.put("/me/settings", response_model=ProfileSettingsResponse)
def update_profile_settings(
    data: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProfileSettingsResponse:
    """Update current user's profile settings."""
    # Check handle uniqueness if changed
    if data.handle is not None and data.handle != "" and data.handle != user.handle:
        existing = session.exec(
            select(User).where(User.handle == data.handle)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Handle already taken")

    # Update fields
    if data.is_public is not None:
        user.is_public = data.is_public
    if data.handle is not None:
        user.handle = data.handle if data.handle != "" else None
    if data.display_name is not None:
        user.display_name = data.display_name if data.display_name != "" else None
    if data.bio is not None:
        user.bio = data.bio if data.bio != "" else None
    if data.show_strategies is not None:
        user.show_strategies = data.show_strategies
    if data.show_contributions is not None:
        user.show_contributions = data.show_contributions
    if data.show_badges is not None:
        user.show_badges = data.show_badges

    session.add(user)
    session.commit()
    session.refresh(user)

    return ProfileSettingsResponse(
        is_public=user.is_public,
        handle=user.handle,
        display_name=user.display_name,
        bio=user.bio,
        show_strategies=user.show_strategies,
        show_contributions=user.show_contributions,
        show_badges=user.show_badges,
        follower_count=user.follower_count,
    )
