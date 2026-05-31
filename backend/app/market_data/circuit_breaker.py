"""Per-provider circuit breaker backed by Redis TTL flags."""
from datetime import datetime, timedelta, timezone
from enum import Enum

from redis import Redis

TRANSIENT_COOLDOWN_SECONDS = 300  # 5 minutes


class FailureKind(str, Enum):
    TRANSIENT = "transient"
    QUOTA = "quota"


def _seconds_until_utc_midnight(now: datetime) -> int:
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return max(int((tomorrow - now).total_seconds()), TRANSIENT_COOLDOWN_SECONDS)


class CircuitBreaker:
    """Tracks provider health via Redis TTL keys.

    trip() sets a key with a TTL sized by failure kind; is_healthy() checks
    whether the key is absent (healthy) or present (tripped).
    """

    def __init__(self, redis_client: Redis) -> None:
        self._redis = redis_client

    def _key(self, name: str) -> str:
        return f"provider:{name}:unhealthy"

    def is_healthy(self, name: str) -> bool:
        return self._redis.get(self._key(name)) is None

    def trip(
        self,
        name: str,
        kind: FailureKind | str,
        now: datetime | None = None,
    ) -> None:
        if now is None:
            now = datetime.now(tz=timezone.utc)
        ttl = (
            _seconds_until_utc_midnight(now)
            if kind == FailureKind.QUOTA
            else TRANSIENT_COOLDOWN_SECONDS
        )
        self._redis.setex(self._key(name), ttl, "1")
