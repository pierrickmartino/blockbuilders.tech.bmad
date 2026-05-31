"""Unit tests for CircuitBreaker (issue #495).

Uses fakeredis for in-process Redis and a fake `now` clock parameter
so tests never sleep or depend on wall-clock time.
"""
from datetime import datetime, timezone

import fakeredis
import pytest

from app.market_data.circuit_breaker import (
    TRANSIENT_COOLDOWN_SECONDS,
    CircuitBreaker,
    FailureKind,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_UTC = timezone.utc

# A fixed "now" that makes quota cooldown deterministic:
# 2024-01-01 06:00 UTC → 18 hours (64 800 s) until midnight.
_NOW = datetime(2024, 1, 1, 6, 0, 0, tzinfo=_UTC)


def _breaker() -> CircuitBreaker:
    return CircuitBreaker(fakeredis.FakeRedis())


# ---------------------------------------------------------------------------
# is_healthy — baseline
# ---------------------------------------------------------------------------


def test_new_provider_is_healthy():
    assert _breaker().is_healthy("cryptocompare") is True


def test_unknown_provider_is_healthy():
    assert _breaker().is_healthy("binance") is True


# ---------------------------------------------------------------------------
# trip — transient
# ---------------------------------------------------------------------------


def test_transient_trip_makes_provider_unhealthy():
    cb = _breaker()
    cb.trip("cryptocompare", FailureKind.TRANSIENT, now=_NOW)
    assert cb.is_healthy("cryptocompare") is False


def test_transient_trip_uses_short_cooldown():
    redis = fakeredis.FakeRedis()
    cb = CircuitBreaker(redis)
    cb.trip("cryptocompare", FailureKind.TRANSIENT, now=_NOW)
    ttl = redis.ttl("provider:cryptocompare:unhealthy")
    assert abs(ttl - TRANSIENT_COOLDOWN_SECONDS) <= 1


def test_transient_trip_only_affects_named_provider():
    cb = _breaker()
    cb.trip("cryptocompare", FailureKind.TRANSIENT, now=_NOW)
    assert cb.is_healthy("binance") is True


# ---------------------------------------------------------------------------
# trip — quota
# ---------------------------------------------------------------------------


def test_quota_trip_makes_provider_unhealthy():
    cb = _breaker()
    cb.trip("cryptocompare", FailureKind.QUOTA, now=_NOW)
    assert cb.is_healthy("cryptocompare") is False


def test_quota_cooldown_is_longer_than_transient_cooldown():
    redis = fakeredis.FakeRedis()
    cb = CircuitBreaker(redis)
    cb.trip("cryptocompare", FailureKind.QUOTA, now=_NOW)
    quota_ttl = redis.ttl("provider:cryptocompare:unhealthy")
    assert quota_ttl > TRANSIENT_COOLDOWN_SECONDS


def test_quota_ttl_reaches_utc_midnight():
    """TTL should be ~18 h when now=06:00 UTC."""
    redis = fakeredis.FakeRedis()
    cb = CircuitBreaker(redis)
    cb.trip("cryptocompare", FailureKind.QUOTA, now=_NOW)
    ttl = redis.ttl("provider:cryptocompare:unhealthy")
    # 18 h = 64 800 s; allow ±2 s for rounding
    assert abs(ttl - 64_800) <= 2


# ---------------------------------------------------------------------------
# Expiry restores health
# ---------------------------------------------------------------------------


def test_health_restored_after_expiry():
    """Simulates TTL expiry by manually deleting the key."""
    redis = fakeredis.FakeRedis()
    cb = CircuitBreaker(redis)
    cb.trip("cryptocompare", FailureKind.TRANSIENT, now=_NOW)
    assert cb.is_healthy("cryptocompare") is False
    redis.delete("provider:cryptocompare:unhealthy")
    assert cb.is_healthy("cryptocompare") is True


# ---------------------------------------------------------------------------
# String kind aliases (router passes strings)
# ---------------------------------------------------------------------------


def test_trip_accepts_string_transient():
    cb = _breaker()
    cb.trip("cryptocompare", "transient", now=_NOW)
    assert cb.is_healthy("cryptocompare") is False


def test_trip_accepts_string_quota():
    cb = _breaker()
    cb.trip("cryptocompare", "quota", now=_NOW)
    assert cb.is_healthy("cryptocompare") is False
