"""Unit tests for StrategyDrafterRateLimiter (ADR-0016, issue #632).

Anti-abuse ceiling for POST /strategies/draft-from-nl: a Redis fixed-window
counter keyed on user.id, fail-open if Redis is unavailable. Prior art:
auth.py's password-reset rate-limit (`_check_rate_limit`).
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from uuid import uuid4

import fakeredis

from app.services.strategy_drafter_rate_limit import StrategyDrafterRateLimiter


def _make_limiter(max_per_window: int, redis_client=None) -> StrategyDrafterRateLimiter:
    return StrategyDrafterRateLimiter(
        redis_client if redis_client is not None else fakeredis.FakeRedis(),
        max_per_window=max_per_window,
        window_seconds=3600,
    )


def test_allows_requests_under_the_limit():
    limiter = _make_limiter(max_per_window=3)
    user_id = uuid4()

    assert limiter.allow(user_id) is True
    assert limiter.allow(user_id) is True
    assert limiter.allow(user_id) is True


def test_denies_request_once_limit_exceeded_at_boundary():
    limiter = _make_limiter(max_per_window=3)
    user_id = uuid4()

    for _ in range(3):
        assert limiter.allow(user_id) is True

    assert limiter.allow(user_id) is False


def test_each_call_consumes_a_unit_regardless_of_caller_outcome():
    """The guard has no notion of success/declined/infra-failure — every
    call to allow() burns one unit of the ceiling (ADR-0016)."""
    limiter = _make_limiter(max_per_window=2)
    user_id = uuid4()

    assert limiter.allow(user_id) is True  # e.g. caller's request "succeeds"
    assert limiter.allow(user_id) is True  # e.g. caller's request is "declined"
    assert limiter.allow(user_id) is False  # e.g. caller's request is an infra failure


def test_counts_are_independent_per_user():
    limiter = _make_limiter(max_per_window=1)
    user_a, user_b = uuid4(), uuid4()

    assert limiter.allow(user_a) is True
    assert limiter.allow(user_a) is False
    assert limiter.allow(user_b) is True


def test_fails_open_when_redis_raises():
    class RaisingRedis:
        def incr(self, key):
            raise ConnectionError("redis down")

    limiter = _make_limiter(max_per_window=1, redis_client=RaisingRedis())
    user_id = uuid4()

    assert limiter.allow(user_id) is True
    assert limiter.allow(user_id) is True
