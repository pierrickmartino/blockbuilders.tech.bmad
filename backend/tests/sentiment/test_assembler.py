"""Tests for SentimentAssembler using fake feeds."""
from app.schemas.market import SentimentIndicator
from app.sentiment.assembler import SentimentAssembler

_INDICATOR = SentimentIndicator(value=55.0, history=[])


class _OkFeed:
    name = "ok_feed"

    def fetch(self, asset):
        return _INDICATOR, "ok"


class _DownFeed:
    name = "down_feed"

    def fetch(self, asset):
        return None, "unavailable"


def _assembler(fg=None, ls=None, fn=None):
    return SentimentAssembler(
        fear_greed_feed=fg or _OkFeed(),
        long_short_feed=ls or _OkFeed(),
        funding_feed=fn or _OkFeed(),
    )


def test_all_feeds_ok_returns_all_ok_statuses():
    snapshot = _assembler().collect("BTC/USDT")
    assert snapshot.source_status.fear_greed == "ok"
    assert snapshot.source_status.long_short_ratio == "ok"
    assert snapshot.source_status.funding == "ok"


def test_all_feeds_ok_returns_indicator_data():
    snapshot = _assembler().collect("BTC/USDT")
    assert snapshot.fear_greed.value == 55.0
    assert snapshot.long_short_ratio.value == 55.0
    assert snapshot.funding.value == 55.0


def test_one_feed_down_marks_that_status_unavailable():
    snapshot = _assembler(fg=_DownFeed()).collect("BTC/USDT")
    assert snapshot.source_status.fear_greed == "unavailable"
    assert snapshot.source_status.long_short_ratio == "ok"
    assert snapshot.source_status.funding == "ok"
    assert snapshot.fear_greed.value is None


def test_all_feeds_down_returns_all_unavailable_snapshot():
    snapshot = _assembler(fg=_DownFeed(), ls=_DownFeed(), fn=_DownFeed()).collect("BTC/USDT")
    assert snapshot.source_status.fear_greed == "unavailable"
    assert snapshot.source_status.long_short_ratio == "unavailable"
    assert snapshot.source_status.funding == "unavailable"


def test_snapshot_asset_is_propagated():
    snapshot = _assembler().collect("ETH/USDT")
    assert snapshot.asset == "ETH/USDT"


def test_snapshot_as_of_is_timezone_aware():
    from datetime import timezone
    snapshot = _assembler().collect("BTC/USDT")
    assert snapshot.as_of.tzinfo is not None
    assert snapshot.as_of.tzinfo == timezone.utc
