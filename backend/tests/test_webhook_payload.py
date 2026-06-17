"""Tests for the signal-framed webhook payload builder."""
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.services.webhook_payload import build_entry_payload

FORBIDDEN_KEYS = {"side", "buy", "sell", "size", "leverage", "price_target", "strategy_graph"}

_CONTEXT = {
    "strategy_name": "Wedge BTC",
    "strategy_version_id": str(uuid4()),
    "asset": "BTC",
    "timeframe": "1h",
    "result_url": "https://blockbuilders.tech/backtests/abc123",
}

_CANDLE_TS = datetime(2025, 3, 10, 12, 0, 0, tzinfo=timezone.utc)


def test_entry_payload_has_required_keys():
    payload = build_entry_payload(candle_ts=_CANDLE_TS, **_CONTEXT)

    assert payload["type"] == "performance_alert"
    assert payload["event"] == "entry"
    assert payload["strategy_name"] == "Wedge BTC"
    assert "strategy_version_id" in payload
    assert payload["asset"] == "BTC"
    assert payload["timeframe"] == "1h"
    assert payload["candle_ts"] == "2025-03-10T12:00:00+00:00"
    assert payload["result_url"] == "https://blockbuilders.tech/backtests/abc123"
    assert "fired_at" in payload


def test_entry_payload_has_no_order_primitives():
    payload = build_entry_payload(candle_ts=_CANDLE_TS, **_CONTEXT)

    present_forbidden = FORBIDDEN_KEYS & set(payload.keys())
    assert not present_forbidden, f"Payload must not contain order primitives: {present_forbidden}"


def test_entry_payload_candle_ts_is_iso8601():
    payload = build_entry_payload(candle_ts=_CANDLE_TS, **_CONTEXT)
    # Must be parseable as ISO-8601 with timezone offset
    parsed = datetime.fromisoformat(payload["candle_ts"])
    assert parsed.tzinfo is not None


def test_entry_payload_fired_at_is_iso8601():
    payload = build_entry_payload(candle_ts=_CANDLE_TS, **_CONTEXT)
    parsed = datetime.fromisoformat(payload["fired_at"])
    assert parsed.tzinfo is not None


def test_entry_payload_strategy_version_id_matches_context():
    version_id = str(uuid4())
    ctx = {**_CONTEXT, "strategy_version_id": version_id}
    payload = build_entry_payload(candle_ts=_CANDLE_TS, **ctx)
    assert payload["strategy_version_id"] == version_id
