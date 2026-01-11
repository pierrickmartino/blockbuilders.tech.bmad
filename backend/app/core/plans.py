"""Plan limits and subscription tier configuration."""
from typing import TypedDict


class PlanLimits(TypedDict):
    """Typed dict for plan limit configuration."""

    max_strategies: int
    max_backtests_per_day: int
    max_history_days: int


PLAN_LIMITS: dict[str, PlanLimits] = {
    "free": {
        "max_strategies": 10,
        "max_backtests_per_day": 50,
        "max_history_days": 365,
    },
    "pro": {
        "max_strategies": 50,
        "max_backtests_per_day": 200,
        "max_history_days": 365 * 3,
    },
    "premium": {
        "max_strategies": 200,
        "max_backtests_per_day": 500,
        "max_history_days": 365 * 10,
    },
}


def get_plan_limits(plan_tier: str) -> PlanLimits:
    """Get limits for a given plan tier.

    Args:
        plan_tier: The plan tier ("free", "pro", or "premium")

    Returns:
        Dictionary with max_strategies, max_backtests_per_day, and max_history_days

    Note:
        Falls back to free tier limits if an invalid tier is provided.
    """
    return PLAN_LIMITS.get(plan_tier, PLAN_LIMITS["free"])
