"""Tests for LongShortRatioFeed — pure parser + HTTP fetch."""
from app.sentiment.feeds.long_short import LongShortRatioFeed, _parse_response

VALID_PAYLOAD = [
    {"longShortRatio": "1.50", "timestamp": 1709913600000},
    {"longShortRatio": "1.60", "timestamp": 1710000000000},
    {"longShortRatio": "1.75", "timestamp": 1710086400000},  # most recent
]


def test_parse_response_returns_correct_value():
    indicator = _parse_response(VALID_PAYLOAD)
    assert indicator is not None
    assert indicator.value == 1.75


def test_parse_response_history_ordered_oldest_first():
    indicator = _parse_response(VALID_PAYLOAD)
    assert indicator is not None
    assert indicator.history[0].v == 1.50
    assert indicator.history[-1].v == 1.75


def test_parse_response_returns_none_for_empty_list():
    assert _parse_response([]) is None


def test_symbol_mapping_strips_slash(monkeypatch):
    captured = {}

    class _Client:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def get(self, url, params=None):
            captured["params"] = params
            return _Response(VALID_PAYLOAD)

    class _Response:
        def raise_for_status(self):
            pass

        def json(self):
            return VALID_PAYLOAD

    monkeypatch.setattr("app.sentiment.feeds.long_short.httpx.Client", lambda **_: _Client())
    feed = LongShortRatioFeed()
    feed.fetch("BTC/USDT")
    assert captured["params"]["symbol"] == "BTCUSDT"


def test_fetch_returns_unavailable_on_error(monkeypatch):
    class _ErrorClient:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def get(self, url, params=None):
            raise OSError("network error")

    monkeypatch.setattr("app.sentiment.feeds.long_short.httpx.Client", lambda **_: _ErrorClient())
    feed = LongShortRatioFeed()
    indicator, status = feed.fetch("BTC/USDT")
    assert status == "unavailable"
    assert indicator is None
