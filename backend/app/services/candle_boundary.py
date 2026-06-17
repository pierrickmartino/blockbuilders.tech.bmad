"""Utilities for determining closed-candle boundaries."""
from datetime import datetime, timedelta, timezone


def last_closed_1d_candle_ts(now: datetime | None = None) -> datetime:
    """Return UTC midnight of the most recently closed daily candle.

    A 1d candle for date D opens at D 00:00 UTC and closes at D+1 00:00 UTC.
    The forming candle (today) has not closed; yesterday's candle always has.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    now_utc = now if now.tzinfo else now.replace(tzinfo=timezone.utc)
    today_midnight = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    return today_midnight - timedelta(days=1)
