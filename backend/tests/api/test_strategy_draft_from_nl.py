"""Integration tests for POST /strategies/draft-from-nl (issue #584).

Walking skeleton for the NL wedge (ADR-0011, ADR-0006, ADR-0005): NL box ->
stub drafter -> GraphCompiler -> validator -> persist -> canvas. Slice 1
ships a stub drafter (no LLM), so these tests cover the endpoint's
contract: flag gate, auth, and the happy path persisting exactly one
Strategy + populated working copy.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from uuid import uuid4

import pytest
from sqlmodel import select

from app.core.config import settings
from app.models.strategy import Strategy, StrategyEntryPath
from app.models.strategy_draft import StrategyDraft


def test_draft_from_nl_requires_auth(client, monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)

    response = client.post(
        "/strategies/draft-from-nl",
        json={"nl_text": "buy when RSI is oversold", "asset": "BTC/USDT", "timeframe": "1d"},
    )

    assert response.status_code == 401


def test_draft_from_nl_returns_disabled_when_flag_off(client, auth_headers, session, monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", False)

    response = client.post(
        "/strategies/draft-from-nl",
        json={"nl_text": "buy when RSI is oversold", "asset": "BTC/USDT", "timeframe": "1d"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["outcome"] == "disabled"
    assert body["strategy_id"] is None
    assert session.exec(select(Strategy)).first() is None


def test_draft_from_nl_success_persists_strategy_and_working_copy(client, auth_headers, session, user, monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)

    response = client.post(
        "/strategies/draft-from-nl",
        json={"nl_text": "buy when RSI is oversold", "asset": "ETH/USDT", "timeframe": "4h"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["outcome"] == "success"
    assert body["reason"] is None
    strategy_id = body["strategy_id"]
    assert strategy_id is not None

    strategies = session.exec(select(Strategy).where(Strategy.user_id == user.id)).all()
    assert len(strategies) == 1
    strategy = strategies[0]
    assert str(strategy.id) == strategy_id
    assert strategy.entry_path == StrategyEntryPath.NL_WEDGE
    assert strategy.asset == "ETH/USDT"
    assert strategy.timeframe == "4h"

    draft = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    assert draft is not None
    assert len(draft.definition_json["blocks"]) > 0
    assert len(draft.definition_json["connections"]) > 0
