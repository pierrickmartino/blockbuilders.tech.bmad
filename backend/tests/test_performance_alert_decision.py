"""Tests for the pure performance-alert entry-decision function.

Covers: entry fires / no-fire / no-refire / watermark advancement.
"""
from datetime import datetime, timezone

from app.services.performance_alert_decision import decide_entry_alert


def _ts(day: int) -> str:
    """Return ISO timestamp for 2025-01-{day} 12:00 UTC."""
    return f"2025-01-{day:02d}T12:00:00+00:00"


def _dt(day: int) -> datetime:
    return datetime(2025, 1, day, 12, 0, 0, tzinfo=timezone.utc)


# ── RED→GREEN 1: entry transition fires ─────────────────────────────────────

def test_entry_on_new_candle_fires():
    trades = [{"entry_time": _ts(5)}]
    watermark = _dt(3)
    run_date_to = _dt(5)

    result = decide_entry_alert(trades, watermark, run_date_to)

    assert len(result.fired_events) == 1
    assert result.fired_events[0].entry_time.date() == _dt(5).date()


# ── RED→GREEN 2: no transition → no fire ────────────────────────────────────

def test_no_trades_does_not_fire():
    result = decide_entry_alert([], None, _dt(5))
    assert result.fired_events == []


def test_entry_at_or_before_watermark_does_not_fire():
    trades = [{"entry_time": _ts(3)}]
    watermark = _dt(3)  # same date as entry
    run_date_to = _dt(5)

    result = decide_entry_alert(trades, watermark, run_date_to)

    assert result.fired_events == []


# ── RED→GREEN 3: no re-fire on same candle ───────────────────────────────────

def test_entry_before_watermark_does_not_refire():
    trades = [{"entry_time": _ts(4)}]
    watermark = _dt(5)  # watermark is ahead of the entry
    run_date_to = _dt(6)

    result = decide_entry_alert(trades, watermark, run_date_to)

    assert result.fired_events == []


def test_multiple_entries_only_new_ones_fire():
    trades = [
        {"entry_time": _ts(2)},  # before watermark
        {"entry_time": _ts(4)},  # at watermark — should NOT fire
        {"entry_time": _ts(6)},  # newer — SHOULD fire
    ]
    watermark = _dt(4)
    run_date_to = _dt(6)

    result = decide_entry_alert(trades, watermark, run_date_to)

    assert len(result.fired_events) == 1
    assert result.fired_events[0].entry_time.date() == _dt(6).date()


# ── RED→GREEN 4: watermark advances ─────────────────────────────────────────

def test_watermark_advances_to_run_date_to_when_fired():
    trades = [{"entry_time": _ts(5)}]
    result = decide_entry_alert(trades, None, _dt(5))
    assert result.new_watermark.date() == _dt(5).date()


def test_watermark_advances_to_run_date_to_even_when_no_fire():
    result = decide_entry_alert([], None, _dt(7))
    assert result.new_watermark.date() == _dt(7).date()


# ── Edge: no prior watermark fires any entry ─────────────────────────────────

def test_no_prior_watermark_fires_all_entries():
    trades = [{"entry_time": _ts(1)}, {"entry_time": _ts(3)}]
    result = decide_entry_alert(trades, None, _dt(3))
    assert len(result.fired_events) == 2


# ── Edge: naive timestamps normalised to UTC ─────────────────────────────────

def test_naive_entry_timestamp_is_normalised():
    naive_ts = "2025-01-05T12:00:00"  # no timezone
    result = decide_entry_alert([{"entry_time": naive_ts}], None, _dt(5))
    assert len(result.fired_events) == 1
    assert result.fired_events[0].entry_time.tzinfo is not None
