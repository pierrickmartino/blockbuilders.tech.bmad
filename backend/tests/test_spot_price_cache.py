"""Unit tests for SpotPriceCache — stale-while-revalidate, asOf, gate, dedupe flag."""
from datetime import datetime, timedelta, timezone

import fakeredis
import pytest

from app.schemas.market import TickerItem, TickerListResponse
from app.services.spot_price_cache import SpotPriceCache


@pytest.fixture
def redis():
    return fakeredis.FakeRedis()


@pytest.fixture
def cache(redis):
    return SpotPriceCache(redis)


def _make_response(price: float = 50_000.0) -> TickerListResponse:
    return TickerListResponse(
        items=[
            TickerItem(
                pair="BTC/USDT",
                price=price,
                change_24h_pct=1.5,
                volume_24h=1_000_000.0,
            )
        ],
        as_of=datetime.now(timezone.utc),
    )


# ── cold cache ────────────────────────────────────────────────────────────────

def test_read_returns_none_when_cache_is_cold(cache):
    assert cache.read() is None


def test_viewed_recently_returns_false_when_never_viewed(cache):
    assert cache.viewed_recently(window=240) is False


def test_set_refresh_pending_succeeds_on_cold_flag(cache):
    assert cache.set_refresh_pending() is True


# ── write / read round-trip ───────────────────────────────────────────────────

def test_read_returns_data_after_write(cache):
    response = _make_response(price=30_000.0)
    cache.write(response)

    result = cache.read()

    assert result is not None
    assert result.items[0].price == 30_000.0


def test_as_of_reflects_write_time(cache):
    before = datetime.now(timezone.utc)
    cache.write(_make_response())
    after = datetime.now(timezone.utc)

    result = cache.read()

    assert result is not None
    assert before <= result.as_of <= after


def test_write_overwrites_previous_prices(cache):
    cache.write(_make_response(price=10_000.0))
    cache.write(_make_response(price=20_000.0))

    result = cache.read()

    assert result is not None
    assert result.items[0].price == 20_000.0


def test_cache_has_no_ttl_after_write(cache, redis):
    cache.write(_make_response())
    ttl = redis.ttl(SpotPriceCache.PRICES_KEY)
    assert ttl == -1  # -1 means persistent (no expiry)


# ── viewed_recently ───────────────────────────────────────────────────────────

def test_viewed_recently_returns_true_after_mark_viewed(cache):
    cache.mark_viewed()
    assert cache.viewed_recently(window=240) is True


def test_viewed_recently_honours_window_boundary(cache, redis):
    # Backdate the viewed timestamp beyond the window
    stale_ts = (datetime.now(timezone.utc) - timedelta(seconds=300)).isoformat()
    redis.set(SpotPriceCache.LAST_VIEWED_KEY, stale_ts)

    assert cache.viewed_recently(window=240) is False


def test_viewed_recently_returns_true_inside_window(cache, redis):
    recent_ts = (datetime.now(timezone.utc) - timedelta(seconds=100)).isoformat()
    redis.set(SpotPriceCache.LAST_VIEWED_KEY, recent_ts)

    assert cache.viewed_recently(window=240) is True


# ── dedupe refresh flag ───────────────────────────────────────────────────────

def test_set_refresh_pending_returns_false_when_flag_already_set(cache):
    cache.set_refresh_pending()
    assert cache.set_refresh_pending() is False  # NX prevents overwrite


def test_refresh_pending_flag_has_short_ttl(cache, redis):
    cache.set_refresh_pending()
    ttl = redis.ttl(SpotPriceCache.REFRESH_PENDING_KEY)
    assert 0 < ttl <= SpotPriceCache.REFRESH_PENDING_TTL
