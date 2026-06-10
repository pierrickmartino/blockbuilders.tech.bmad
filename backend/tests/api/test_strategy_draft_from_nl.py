"""Integration tests for POST /strategies/draft-from-nl (issue #584, #585).

Walking skeleton for the NL wedge (ADR-0011, ADR-0006, ADR-0005): NL box ->
drafter -> GraphCompiler -> validator -> persist -> canvas. Slice 1 ships a
stub drafter (no LLM), so the default-path tests below cover the endpoint's
contract: flag gate, auth, and the happy path persisting exactly one
Strategy + populated working copy. Slice 2 adds a fake-provider end-to-end
test for the real `LLMStrategyDrafter` path (ADR-0011) — no real LLM calls.
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


# ── slice 2: LLMStrategyDrafter via fake provider (no real LLM calls) ─────

class _FakeCompletions:
    def __init__(self, result):
        self._result = result

    def create(self, **kwargs):
        return self._result


class _FakeChat:
    def __init__(self, result):
        self.completions = _FakeCompletions(result)


class FakeInstructorClient:
    """Mimics instructor's `client.chat.completions.create(...)` interface."""

    def __init__(self, result):
        self.chat = _FakeChat(result)


def test_draft_from_nl_llm_drafter_persists_strategy_and_working_copy(
    client, auth_headers, session, user, monkeypatch
):
    from app.schemas.strategy_draft_ir import DraftedBlockIR, DraftedConnectionIR, DraftedIR, DraftedOutcome
    from app.services.strategy_drafter import LLMStrategyDrafter

    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)

    fake_ir = DraftedIR(
        blocks=[
            DraftedBlockIR(ref="fast", type="sma", label="SMA (10)", params={"period": 10}),
            DraftedBlockIR(ref="slow", type="sma", label="SMA (30)", params={"period": 30}),
            DraftedBlockIR(
                ref="cross",
                type="crossover",
                label="Fast crosses above Slow",
                params={"direction": "crosses_above"},
            ),
            DraftedBlockIR(ref="entry", type="entry_signal", label="Entry Signal", params={}),
            DraftedBlockIR(ref="stop", type="stop_loss", label="Stop Loss (5%)", params={"stop_loss_pct": 5}),
        ],
        connections=[
            DraftedConnectionIR(from_ref="fast", from_port="output", to_ref="cross", to_port="fast"),
            DraftedConnectionIR(from_ref="slow", from_port="output", to_ref="cross", to_port="slow"),
            DraftedConnectionIR(from_ref="cross", from_port="output", to_ref="entry", to_port="signal"),
        ],
    )
    fake_drafter = LLMStrategyDrafter(
        client=FakeInstructorClient(DraftedOutcome(ir=fake_ir)), model="claude-sonnet-4-6"
    )
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: fake_drafter)

    response = client.post(
        "/strategies/draft-from-nl",
        json={
            "nl_text": "buy when the 10-period SMA crosses above the 30-period SMA, with a 5% stop loss",
            "asset": "BTC/USDT",
            "timeframe": "4h",
        },
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["outcome"] == "success"
    assert body["reason"] is None
    strategy_id = body["strategy_id"]
    assert strategy_id is not None

    strategy = session.exec(select(Strategy).where(Strategy.user_id == user.id)).one()
    assert str(strategy.id) == strategy_id
    assert strategy.entry_path == StrategyEntryPath.NL_WEDGE
    assert strategy.asset == "BTC/USDT"
    assert strategy.timeframe == "4h"

    draft = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    assert draft is not None
    block_types = {b["type"] for b in draft.definition_json["blocks"]}
    assert block_types == {"sma", "crossover", "entry_signal", "stop_loss"}
    assert len(draft.definition_json["connections"]) == 3
