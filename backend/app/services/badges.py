from typing import List
from app.schemas.profile import Badge


def compute_badges(
    published_strategies_count: int,
    completed_backtests_count: int,
    follower_count: int,
) -> List[Badge]:
    """
    Compute badges based on current counts.
    Badges are computed on-read, not stored.
    """
    badges = []

    if published_strategies_count >= 1:
        badges.append(Badge(
            key="first_public_strategy",
            label="First Public Strategy"
        ))

    if follower_count >= 10:
        badges.append(Badge(
            key="ten_followers",
            label="10 Followers"
        ))

    if completed_backtests_count >= 100:
        badges.append(Badge(
            key="hundred_backtests",
            label="100 Backtests Run"
        ))

    return badges
