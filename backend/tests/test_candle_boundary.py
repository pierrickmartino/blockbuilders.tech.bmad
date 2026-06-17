"""Tests for candle-boundary utility."""
from datetime import datetime, timezone

import pytest

from app.services.candle_boundary import last_closed_1d_candle_ts, last_closed_candle_ts


def test_returns_yesterday_midnight_at_midnight():
    now = datetime(2025, 3, 10, 0, 0, 0, tzinfo=timezone.utc)
    result = last_closed_1d_candle_ts(now)
    assert result == datetime(2025, 3, 9, 0, 0, 0, tzinfo=timezone.utc)


def test_returns_yesterday_midnight_mid_day():
    now = datetime(2025, 3, 10, 14, 30, 0, tzinfo=timezone.utc)
    result = last_closed_1d_candle_ts(now)
    assert result == datetime(2025, 3, 9, 0, 0, 0, tzinfo=timezone.utc)


def test_returns_yesterday_midnight_one_second_before_midnight():
    now = datetime(2025, 3, 10, 23, 59, 59, tzinfo=timezone.utc)
    result = last_closed_1d_candle_ts(now)
    assert result == datetime(2025, 3, 9, 0, 0, 0, tzinfo=timezone.utc)


def test_result_is_always_utc_aware():
    result = last_closed_1d_candle_ts(datetime(2025, 3, 10, 12, 0, tzinfo=timezone.utc))
    assert result.tzinfo is not None


def test_naive_input_treated_as_utc():
    naive_now = datetime(2025, 3, 10, 12, 0, 0)  # no tzinfo
    result = last_closed_1d_candle_ts(naive_now)
    assert result == datetime(2025, 3, 9, 0, 0, 0, tzinfo=timezone.utc)


# ── last_closed_candle_ts — 1h ────────────────────────────────────────────────

def test_1h_mid_candle_returns_previous_hour():
    now = datetime(2025, 3, 10, 14, 30, 0, tzinfo=timezone.utc)
    result = last_closed_candle_ts("1h", now)
    assert result == datetime(2025, 3, 10, 13, 0, 0, tzinfo=timezone.utc)


def test_1h_exactly_on_boundary_returns_previous_hour():
    # At 14:00:00, the 14:00 candle just opened; 13:00 just closed.
    now = datetime(2025, 3, 10, 14, 0, 0, tzinfo=timezone.utc)
    result = last_closed_candle_ts("1h", now)
    assert result == datetime(2025, 3, 10, 13, 0, 0, tzinfo=timezone.utc)


def test_1h_at_midnight_wraps_to_previous_day():
    now = datetime(2025, 3, 10, 0, 30, 0, tzinfo=timezone.utc)
    result = last_closed_candle_ts("1h", now)
    assert result == datetime(2025, 3, 9, 23, 0, 0, tzinfo=timezone.utc)


# ── last_closed_candle_ts — 4h ────────────────────────────────────────────────

def test_4h_mid_candle_returns_previous_4h_boundary():
    # At 10:30 the forming candle opened at 08:00; last closed opened at 04:00.
    now = datetime(2025, 3, 10, 10, 30, 0, tzinfo=timezone.utc)
    result = last_closed_candle_ts("4h", now)
    assert result == datetime(2025, 3, 10, 4, 0, 0, tzinfo=timezone.utc)


def test_4h_exactly_on_boundary_returns_previous_4h_boundary():
    # At 12:00:00 UTC the 12:00 candle opens; 08:00 candle just closed.
    now = datetime(2025, 3, 10, 12, 0, 0, tzinfo=timezone.utc)
    result = last_closed_candle_ts("4h", now)
    assert result == datetime(2025, 3, 10, 8, 0, 0, tzinfo=timezone.utc)


def test_4h_crosses_midnight():
    # At 00:30 UTC the 00:00 candle is forming; previous is yesterday 20:00.
    now = datetime(2025, 3, 10, 0, 30, 0, tzinfo=timezone.utc)
    result = last_closed_candle_ts("4h", now)
    assert result == datetime(2025, 3, 9, 20, 0, 0, tzinfo=timezone.utc)


# ── last_closed_candle_ts — 1d delegation ────────────────────────────────────

def test_1d_delegates_to_existing_behaviour():
    now = datetime(2025, 3, 10, 14, 30, 0, tzinfo=timezone.utc)
    assert last_closed_candle_ts("1d", now) == last_closed_1d_candle_ts(now)


# ── last_closed_candle_ts — unsupported timeframe ────────────────────────────

def test_unsupported_timeframe_raises():
    with pytest.raises(ValueError, match="Unsupported timeframe"):
        last_closed_candle_ts("5m")
