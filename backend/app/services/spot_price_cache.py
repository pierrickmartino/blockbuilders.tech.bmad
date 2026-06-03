"""Single-writer spot-price cache backed by Redis."""
import json
from datetime import datetime, timezone

from redis import Redis

from app.schemas.market import TickerListResponse


class SpotPriceCache:
    PRICES_KEY = "spot:prices"
    LAST_VIEWED_KEY = "spot:last_viewed"
    REFRESH_PENDING_KEY = "spot:refresh_pending"
    REFRESH_PENDING_TTL = 5  # seconds

    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    def read(self) -> TickerListResponse | None:
        """Return last-known prices immediately, or None on cold cache."""
        raw = self._redis.get(self.PRICES_KEY)
        if raw is None:
            return None
        data = json.loads(raw)
        data["as_of"] = datetime.fromisoformat(data["as_of"])
        return TickerListResponse(**data)

    def write(self, response: TickerListResponse) -> None:
        """Persist prices with a fresh asOf timestamp. No TTL — persists forever."""
        as_of = datetime.now(timezone.utc)
        data = response.model_dump()
        data["as_of"] = as_of.isoformat()
        self._redis.set(self.PRICES_KEY, json.dumps(data))

    def mark_viewed(self) -> None:
        """Record that the ticker endpoint was just viewed."""
        self._redis.set(self.LAST_VIEWED_KEY, datetime.now(timezone.utc).isoformat())

    def viewed_recently(self, window: int) -> bool:
        """True if the ticker was viewed within the last *window* seconds."""
        raw = self._redis.get(self.LAST_VIEWED_KEY)
        if raw is None:
            return False
        last_viewed = datetime.fromisoformat(raw.decode())
        elapsed = (datetime.now(timezone.utc) - last_viewed).total_seconds()
        return elapsed < window

    def set_refresh_pending(self) -> bool:
        """Set a short-lived NX flag so concurrent requests don't double-enqueue.

        Returns True only when this call was the one that set the flag.
        """
        result = self._redis.set(
            self.REFRESH_PENDING_KEY,
            "1",
            nx=True,
            ex=self.REFRESH_PENDING_TTL,
        )
        return result is True
