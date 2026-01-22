from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.schemas.progress import (
    AchievementItem,
    AchievementsResponse,
    LessonItem,
    LessonsResponse,
    ProgressResponse,
)

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("", response_model=ProgressResponse)
def get_progress(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProgressResponse:
    """Get current user's progress metrics, lessons, and achievements."""

    # Count active strategies (non-archived)
    strategies_count = session.exec(
        select(func.count(Strategy.id)).where(
            Strategy.user_id == user.id,
            Strategy.is_archived == False,  # noqa: E712
        )
    ).one()

    # Count strategy versions (join with user's strategies)
    strategy_versions_count = session.exec(
        select(func.count(StrategyVersion.id))
        .join(Strategy, StrategyVersion.strategy_id == Strategy.id)
        .where(Strategy.user_id == user.id)
    ).one()

    # Count completed backtests
    completed_backtests_count = session.exec(
        select(func.count(BacktestRun.id)).where(
            BacktestRun.user_id == user.id,
            BacktestRun.status == "completed",
        )
    ).one()

    # Compute lessons (4 boolean milestones)
    lessons = [
        LessonItem(
            key="first_strategy",
            label="Created first strategy",
            done=strategies_count >= 1,
        ),
        LessonItem(
            key="saved_version",
            label="Saved a strategy version",
            done=strategy_versions_count >= 1,
        ),
        LessonItem(
            key="first_backtest",
            label="Ran first backtest",
            done=completed_backtests_count >= 1,
        ),
        LessonItem(
            key="reviewed_results",
            label="Reviewed results",
            done=completed_backtests_count >= 1,
        ),
    ]
    completed_lessons = sum(1 for lesson in lessons if lesson.done)

    # Compute achievements (4 thresholds)
    achievements_list = [
        {
            "key": "first_strategy",
            "label": "First Strategy",
            "threshold": 1,
            "count": strategies_count,
        },
        {
            "key": "five_strategies",
            "label": "5 Strategies",
            "threshold": 5,
            "count": strategies_count,
        },
        {
            "key": "first_backtest",
            "label": "First Backtest",
            "threshold": 1,
            "count": completed_backtests_count,
        },
        {
            "key": "ten_backtests",
            "label": "10 Backtests",
            "threshold": 10,
            "count": completed_backtests_count,
        },
    ]

    unlocked_count = 0
    latest_achievement = None
    for ach in achievements_list:
        if ach["count"] >= ach["threshold"]:
            unlocked_count += 1
            latest_achievement = AchievementItem(
                key=ach["key"], label=ach["label"]
            )

    # Generate next steps (rule-based suggestions)
    if strategies_count == 0:
        next_steps = ["Create your first strategy"]
    elif completed_backtests_count == 0:
        next_steps = ["Run your first backtest"]
    elif strategy_versions_count == 0:
        next_steps = ["Save a new version of a strategy"]
    else:
        next_steps = ["Review your latest backtest results"]

    return ProgressResponse(
        strategies_count=strategies_count,
        strategy_versions_count=strategy_versions_count,
        completed_backtests_count=completed_backtests_count,
        lessons=LessonsResponse(
            total=len(lessons),
            completed=completed_lessons,
            items=lessons,
        ),
        achievements=AchievementsResponse(
            total=len(achievements_list),
            unlocked=unlocked_count,
            latest=latest_achievement,
        ),
        next_steps=next_steps,
    )
