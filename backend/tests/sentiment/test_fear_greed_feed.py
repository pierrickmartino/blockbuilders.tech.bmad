"""Tests for FearGreedFeed — pure parser + HTTP fetch."""
import pytest

from app.sentiment.feeds.fear_greed import FearGreedFeed, _parse_response

# ---------------------------------------------------------------------------
# Recorded payloads
# ---------------------------------------------------------------------------

VALID_PAYLOAD = {
    "data": [
        {"value": "62", "timestamp": "1710086400"},  # most recent
        {"value": "58", "timestamp": "1710000000"},
        {"value": "55", "timestamp": "1709913600"},
    ]
}

EMPTY_DATA_PAYLOAD = {"data": []}
NO_DATA_KEY_PAYLOAD = {"name": "Fear and Greed Index"}


# ---------------------------------------------------------------------------
# _parse_response — pure function tests
# ---------------------------------------------------------------------------


def test_parse_response_returns_correct_value():
    indicator = _parse_response(VALID_PAYLOAD)
    assert indicator is not None
    assert indicator.value == 62.0


def test_parse_response_history_ordered_oldest_first():
    indicator = _parse_response(VALID_PAYLOAD)
    assert indicator is not None
    assert len(indicator.history) == 3
    assert indicator.history[0].v == 55.0
    assert indicator.history[-1].v == 62.0


def test_parse_response_history_has_iso_dates():
    indicator = _parse_response(VALID_PAYLOAD)
    assert indicator is not None
    for point in indicator.history:
        # YYYY-MM-DD format
        assert len(point.t) == 10
        assert point.t[4] == "-" and point.t[7] == "-"


def test_parse_response_returns_none_when_data_empty():
    assert _parse_response(EMPTY_DATA_PAYLOAD) is None


def test_parse_response_returns_none_when_no_data_key():
    assert _parse_response(NO_DATA_KEY_PAYLOAD) is None


# ---------------------------------------------------------------------------
# FearGreedFeed.fetch — HTTP-level tests (monkeypatched)
# ---------------------------------------------------------------------------


class _OkClient:
    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def get(self, url, params=None):
        return _Response(VALID_PAYLOAD)


class _ErrorClient:
    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def get(self, url, params=None):
        raise OSError("network error")


class _Response:
    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        pass

    def json(self):
        return self._data


def test_fetch_returns_ok_status_on_success(monkeypatch):
    monkeypatch.setattr("app.sentiment.feeds.fear_greed.httpx.Client", lambda **_: _OkClient())
    feed = FearGreedFeed()
    indicator, status = feed.fetch("BTC/USDT")
    assert status == "ok"
    assert indicator is not None
    assert indicator.value == 62.0


def test_fetch_returns_unavailable_on_network_error(monkeypatch):
    monkeypatch.setattr("app.sentiment.feeds.fear_greed.httpx.Client", lambda **_: _ErrorClient())
    feed = FearGreedFeed()
    indicator, status = feed.fetch("BTC/USDT")
    assert status == "unavailable"
    assert indicator is None
