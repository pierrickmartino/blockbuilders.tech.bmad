"""Tests for refresh_spot_prices cache-poisoning protection and last-known-good merge."""
from datetime import datetime, timezone
from unittest.mock import patch

import fakeredis

from app.schemas.market import TickerItem, TickerListResponse
from app.services.spot_price_cache import SpotPriceCache
from app.worker.jobs import _merge_with_cached, refresh_spot_prices


def _item(pair, price, change=0.0, volume=0.0):
    return TickerItem(pair=pair, price=price, change_24h_pct=change, volume_24h=volume)


# --------------------------------------------------------------------------- #
# _merge_with_cached — pure merge logic                                         #
# --------------------------------------------------------------------------- #


def test_merge_with_no_cache_returns_fresh():
    fresh = [_item("BTC/USDT", 50000.0)]
    assert _merge_with_cached(fresh, None) == fresh


def test_merge_preserves_cached_for_assets_missing_this_cycle():
    cached = TickerListResponse(
        items=[_item("BTC/USDT", 50000.0), _item("ETH/USDT", 3000.0)],
        as_of=datetime.now(timezone.utc),
    )
    fresh = [_item("BTC/USDT", 51000.0)]  # ETH missing this cycle

    merged = {i.pair: i.price for i in _merge_with_cached(fresh, cached)}

    assert merged["BTC/USDT"] == 51000.0  # fresh wins
    assert merged["ETH/USDT"] == 3000.0  # last-known-good preserved


def test_merge_appends_new_pairs_not_in_cache():
    cached = TickerListResponse(items=[_item("BTC/USDT", 50000.0)], as_of=datetime.now(timezone.utc))
    fresh = [_item("BTC/USDT", 51000.0), _item("SOL/USDT", 80.0)]

    pairs = [i.pair for i in _merge_with_cached(fresh, cached)]

    assert pairs == ["BTC/USDT", "SOL/USDT"]


# --------------------------------------------------------------------------- #
# refresh_spot_prices — end-to-end with fakeredis                               #
# --------------------------------------------------------------------------- #


def _run_refresh(redis, fetched_items):
    """Run refresh_spot_prices with the gate open and a stubbed fetch."""
    with patch("app.worker.jobs.Redis.from_url", return_value=redis), \
         patch("app.worker.jobs._has_active_price_alerts", return_value=True), \
         patch("app.worker.jobs._fetch_full_ticker_items", return_value=fetched_items):
        refresh_spot_prices()


def test_refresh_does_not_overwrite_good_cache_when_fetch_empty():
    redis = fakeredis.FakeRedis()
    cache = SpotPriceCache(redis)
    cache.write(TickerListResponse(items=[_item("BTC/USDT", 50000.0)], as_of=datetime.now(timezone.utc)))

    _run_refresh(redis, [])  # total provider failure → no items

    result = cache.read()
    assert result is not None
    assert result.items[0].price == 50000.0  # good cache preserved, not zeroed


def test_refresh_merges_partial_fetch_over_cache():
    redis = fakeredis.FakeRedis()
    cache = SpotPriceCache(redis)
    cache.write(TickerListResponse(
        items=[_item("BTC/USDT", 50000.0), _item("ETH/USDT", 3000.0)],
        as_of=datetime.now(timezone.utc),
    ))

    _run_refresh(redis, [_item("BTC/USDT", 51000.0)])  # only BTC fresh

    prices = {i.pair: i.price for i in cache.read().items}
    assert prices["BTC/USDT"] == 51000.0
    assert prices["ETH/USDT"] == 3000.0  # preserved, never zeroed


def test_refresh_never_writes_zero_prices():
    redis = fakeredis.FakeRedis()
    cache = SpotPriceCache(redis)

    _run_refresh(redis, [_item("BTC/USDT", 51000.0)])

    assert all(i.price > 0 for i in cache.read().items)
