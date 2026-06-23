"""Tests for FundingRateFeed — pure parser + HTTP fetch."""
from app.sentiment.feeds.funding import FundingRateFeed, _parse_response

# Three funding events: two on day 1 (2024-03-08), one on day 2 (2024-03-09)
VALID_PAYLOAD = [
    {"fundingRate": "0.00010", "fundingTime": 1709884800000},  # 2024-03-08 08:00 UTC
    {"fundingRate": "0.00020", "fundingTime": 1709913600000},  # 2024-03-08 16:00 UTC
    {"fundingRate": "0.00030", "fundingTime": 1709942400000},  # 2024-03-09 00:00 UTC (most recent)
]


def test_parse_response_returns_most_recent_value():
    indicator = _parse_response(VALID_PAYLOAD)
    assert indicator is not None
    assert indicator.value == pytest_approx(0.00030)


def test_parse_response_averages_rates_per_day():
    from app.sentiment.feeds.funding import _parse_response as parse

    indicator = parse(VALID_PAYLOAD)
    assert indicator is not None
    # Two distinct days: day1 avg = (0.0001+0.0002)/2 = 0.00015, day2 = 0.0003
    assert len(indicator.history) == 2
    assert abs(indicator.history[0].v - 0.00015) < 1e-9
    assert abs(indicator.history[1].v - 0.00030) < 1e-9


def test_parse_response_history_ordered_oldest_first():
    indicator = _parse_response(VALID_PAYLOAD)
    assert indicator is not None
    assert indicator.history[0].t < indicator.history[-1].t


def test_parse_response_returns_none_for_empty_list():
    assert _parse_response([]) is None


def test_fetch_returns_unavailable_on_error(monkeypatch):
    class _ErrorClient:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def get(self, url, params=None):
            raise OSError("network error")

    monkeypatch.setattr("app.sentiment.feeds.funding.httpx.Client", lambda **_: _ErrorClient())
    feed = FundingRateFeed()
    indicator, status = feed.fetch("BTC/USDT")
    assert status == "unavailable"
    assert indicator is None


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def pytest_approx(v):
    return v  # real approx used inline via abs() above
