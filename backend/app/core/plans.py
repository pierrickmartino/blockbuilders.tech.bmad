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


def apply_beta_bonuses(limits: PlanLimits, user_tier: str) -> PlanLimits:
    """Apply beta user bonuses to plan limits.

    Args:
        limits: Base plan limits
        user_tier: User tier ("standard" or "beta")

    Returns:
        Plan limits with beta bonuses applied if applicable
    """
    if user_tier != "beta":
        return limits

    return {
        "max_strategies": limits["max_strategies"] + 10,
        "max_backtests_per_day": limits["max_backtests_per_day"] + 50,
        "max_history_days": limits["max_history_days"],
    }


def get_effective_limits(plan_tier: str, user_tier: str, extra_slots: int = 0) -> dict:
    """Get effective limits accounting for plan, beta bonuses, and extra slots.

    Args:
        plan_tier: Plan tier (free/pro/premium)
        user_tier: User tier (standard/beta)
        extra_slots: Purchased extra strategy slots

    Returns:
        Dictionary with effective max_strategies and max_backtests_per_day
    """
    base_limits = get_plan_limits(plan_tier)
    limits_with_beta = apply_beta_bonuses(base_limits, user_tier)

    return {
        "max_strategies": limits_with_beta["max_strategies"] + extra_slots,
        "max_backtests_per_day": limits_with_beta["max_backtests_per_day"],
        "max_history_days": limits_with_beta["max_history_days"],
    }


def get_plan_pricing(plan_tier: str, interval: str, user_tier: str) -> dict:
    """Get pricing for a plan with beta discount applied if applicable.

    Args:
        plan_tier: Plan tier (free/pro/premium)
        interval: Billing interval (monthly/annual)
        user_tier: User tier (standard/beta)

    Returns:
        Dictionary with base_price, discount_percent, and final_price
    """
    # Base monthly prices (in USD)
    base_monthly_prices = {
        "free": 0.0,
        "pro": 29.0,
        "premium": 79.0,
    }

    # Annual discount: ~20% off (10 months price for 12 months)
    annual_multiplier = 10.0

    base_price = base_monthly_prices.get(plan_tier, 0.0)

    if interval == "annual":
        base_price = base_price * annual_multiplier

    discount_percent = 0.20 if user_tier == "beta" and base_price > 0 else 0.0
    final_price = base_price * (1 - discount_percent)

    return {
        "base_price": base_price,
        "discount_percent": discount_percent,
        "final_price": final_price,
    }
