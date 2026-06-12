"""Anti-abuse ceiling for the NL-wedge drafter endpoint (ADR-0016, #9).

A Redis fixed-window counter keyed on `user.id`, reusing the
`auth.py:_check_rate_limit` pattern. Fails open (allows the request) if
Redis is unavailable — the threat model is a scripted-abuse account, not a
paying customer (ADR-0007).
"""
from __future__ import annotations

import logging
from uuid import UUID

from redis import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class StrategyDrafterRateLimiter:
    """Allow/deny per-user drafter requests via a Redis fixed-window counter."""

    def __init__(self, redis_client: Redis, max_per_window: int, window_seconds: int) -> None:
        self._redis = redis_client
        self._max_per_window = max_per_window
        self._window_seconds = window_seconds

    def allow(self, user_id: UUID) -> bool:
        """Increment the per-user counter and report whether this request is allowed.

        Every call increments the window's counter (success, decline, and
        infra-failure all consume one unit — ADR-0016). Returns `True` (and
        fails open) if Redis raises.
        """
        key = f"strategy_drafter_rate:{user_id}"
        try:
            count = self._redis.incr(key)
            if count == 1:
                self._redis.expire(key, self._window_seconds)
            return count <= self._max_per_window
        except Exception as exc:
            logger.warning("strategy_drafter_rate_limit_check_failed", extra={"error": str(exc)})
            return True


def get_strategy_drafter_rate_limiter() -> StrategyDrafterRateLimiter:
    redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    return StrategyDrafterRateLimiter(
        redis_client,
        max_per_window=settings.strategy_drafter_max_per_window,
        window_seconds=settings.strategy_drafter_rate_limit_window_seconds,
    )
