"""Tests for candle-boundary utility."""
from datetime import datetime, timezone

import pytest

from app.services.candle_boundary import last_closed_1d_candle_ts


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
