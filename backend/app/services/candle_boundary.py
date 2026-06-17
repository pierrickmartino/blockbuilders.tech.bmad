"""Utilities for determining closed-candle boundaries."""
from datetime import datetime, timedelta, timezone

_TIMEFRAME_SECONDS = {
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
}


def last_closed_candle_ts(timeframe: str, now: datetime | None = None) -> datetime:
    """Return the open-timestamp of the most recently closed candle for *timeframe*.

    A candle that opens at T closes at T + period. At exactly T the new candle
    has just opened so the *previous* period is the last closed one.

    Supported timeframes: "1h", "4h", "1d".
    """
    if timeframe not in _TIMEFRAME_SECONDS:
        raise ValueError(f"Unsupported timeframe: {timeframe!r}")

    if now is None:
        now = datetime.now(timezone.utc)
    now_utc = now if now.tzinfo else now.replace(tzinfo=timezone.utc)

    if timeframe == "1d":
        period_open = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        return period_open - timedelta(days=1)

    if timeframe == "4h":
        period_hour = (now_utc.hour // 4) * 4
        period_open = now_utc.replace(hour=period_hour, minute=0, second=0, microsecond=0)
        return period_open - timedelta(hours=4)

    # "1h"
    period_open = now_utc.replace(minute=0, second=0, microsecond=0)
    return period_open - timedelta(hours=1)


def last_closed_1d_candle_ts(now: datetime | None = None) -> datetime:
    """Return UTC midnight of the most recently closed daily candle.

    A 1d candle for date D opens at D 00:00 UTC and closes at D+1 00:00 UTC.
    The forming candle (today) has not closed; yesterday's candle always has.
    """
    return last_closed_candle_ts("1d", now)
