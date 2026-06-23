"""Route-level tests for GET /market/sentiment — assembler stubbed via monkeypatch."""
from datetime import datetime, timezone

import pytest

from app.schemas.market import (
    MarketSentimentResponse,
    SentimentIndicator,
    SourceStatus,
)

_ALL_OK_SNAPSHOT = MarketSentimentResponse(
    as_of=datetime(2024, 3, 9, tzinfo=timezone.utc),
    asset="BTC/USDT",
    fear_greed=SentimentIndicator(value=62.0, history=[]),
    long_short_ratio=SentimentIndicator(value=1.75, history=[]),
    funding=SentimentIndicator(value=0.0001, history=[]),
    source_status=SourceStatus(
        fear_greed="ok", long_short_ratio="ok", funding="ok"
    ),
)

_ALL_DOWN_SNAPSHOT = MarketSentimentResponse(
    as_of=datetime(2024, 3, 9, tzinfo=timezone.utc),
    asset="BTC/USDT",
    fear_greed=SentimentIndicator(),
    long_short_ratio=SentimentIndicator(),
    funding=SentimentIndicator(),
    source_status=SourceStatus(
        fear_greed="unavailable",
        long_short_ratio="unavailable",
        funding="unavailable",
    ),
)


def _stub_assembler(snapshot, monkeypatch):
    class _FakeAssembler:
        calls: list = []

        def collect(self, asset):
            self.calls.append(asset)
            return snapshot

    fake = _FakeAssembler()
    monkeypatch.setattr("app.api.market._sentiment_assembler", fake)
    return fake


def _stub_redis_cold(monkeypatch):
    class _Redis:
        def get(self, key):
            return None

        def setex(self, key, ttl, val):
            pass

    monkeypatch.setattr("app.api.market._get_redis", lambda: _Redis())


def test_sentiment_returns_200_when_all_feeds_ok(client, auth_headers, monkeypatch):
    _stub_assembler(_ALL_OK_SNAPSHOT, monkeypatch)
    _stub_redis_cold(monkeypatch)
    r = client.get("/market/sentiment", headers=auth_headers, params={"asset": "BTC/USDT"})
    assert r.status_code == 200
    body = r.json()
    assert body["asset"] == "BTC/USDT"
    assert body["fear_greed"]["value"] == 62.0
    assert body["source_status"]["fear_greed"] == "ok"


def test_sentiment_returns_503_when_all_feeds_unavailable(client, auth_headers, monkeypatch):
    _stub_assembler(_ALL_DOWN_SNAPSHOT, monkeypatch)
    _stub_redis_cold(monkeypatch)
    r = client.get("/market/sentiment", headers=auth_headers, params={"asset": "BTC/USDT"})
    assert r.status_code == 503


def test_sentiment_returns_400_for_unsupported_asset(client, auth_headers, monkeypatch):
    fake = _stub_assembler(_ALL_OK_SNAPSHOT, monkeypatch)
    _stub_redis_cold(monkeypatch)
    r = client.get("/market/sentiment", headers=auth_headers, params={"asset": "UNKNOWN/USD"})
    assert r.status_code == 400
    assert fake.calls == []  # assembler never called


def test_sentiment_uses_cache_and_skips_assembler(client, auth_headers, monkeypatch):
    import json

    cached_payload = _ALL_OK_SNAPSHOT.model_dump()
    cached_payload["as_of"] = cached_payload["as_of"].isoformat()

    class _CachedRedis:
        def get(self, key):
            return json.dumps(cached_payload).encode()

        def setex(self, key, ttl, val):
            pass

    monkeypatch.setattr("app.api.market._get_redis", lambda: _CachedRedis())
    fake = _stub_assembler(_ALL_OK_SNAPSHOT, monkeypatch)
    r = client.get("/market/sentiment", headers=auth_headers, params={"asset": "BTC/USDT"})
    assert r.status_code == 200
    assert fake.calls == []  # assembler never called — served from cache
