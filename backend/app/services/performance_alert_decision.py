"""Pure decision function for performance alert entry detection.

This module is side-effect free. Callers are responsible for DB and
notification operations after receiving a DecisionResult.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


def _parse_ts(ts: Any) -> datetime | None:
    if ts is None:
        return None
    if isinstance(ts, datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@dataclass
class EntryFireEvent:
    entry_time: datetime


@dataclass
class DecisionResult:
    fired_events: list[EntryFireEvent] = field(default_factory=list)
    new_watermark: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def decide_entry_alert(
    trades: list[dict],
    watermark: datetime | None,
    run_date_to: datetime,
) -> DecisionResult:
    """Detect flat→long entry transitions on candles strictly newer than watermark.

    Watermark always advances to run_date_to so the same candle never re-fires.
    The forming (not-yet-closed) candle must be excluded by the caller: pass
    only runs whose date_to ≤ last_closed_1d_candle_ts().
    """
    watermark_utc = _utc(watermark) if watermark is not None else None
    run_date_to_utc = _utc(run_date_to)
    fired: list[EntryFireEvent] = []

    for trade in trades:
        entry_time = _parse_ts(trade.get("entry_time"))
        if entry_time is None:
            continue
        entry_utc = _utc(entry_time)

        if watermark_utc is not None and entry_utc.date() <= watermark_utc.date():
            continue  # At or before watermark — already evaluated

        fired.append(EntryFireEvent(entry_time=entry_utc))

    return DecisionResult(fired_events=fired, new_watermark=run_date_to_utc)
