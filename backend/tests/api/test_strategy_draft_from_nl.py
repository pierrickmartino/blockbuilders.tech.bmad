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
from app.schemas.strategy_draft_ir import DraftedBlockIR, DraftedConnectionIR, DraftedIR, DraftedOutcome
from app.schemas.token_usage import TokenUsage


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
    def __init__(self, result, completion=None):
        self._result = result
        self._completion = completion

    def create(self, **kwargs):
        return self._result

    def create_with_completion(self, **kwargs):
        return self._result, self._completion


class _FakeChat:
    def __init__(self, result, completion=None):
        self.completions = _FakeCompletions(result, completion)


class FakeInstructorClient:
    """Mimics instructor's `client.chat.completions.create_with_completion(...)` interface."""

    def __init__(self, result, completion=None):
        self.chat = _FakeChat(result, completion)


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


# ── slice 4: refusal path — declined arm + validator-invalid → refusal ───
#
# Both cases return `success: true` (HTTP 200, outcome="declined") with a
# plain-language `reason`, and persist zero rows (no Strategy, no
# StrategyDraft).

def test_draft_from_nl_declined_by_drafter_persists_nothing(client, auth_headers, session, user, monkeypatch):
    from app.schemas.strategy_draft_ir import DeclinedOutcome
    from app.services.strategy_drafter import LLMStrategyDrafter

    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)

    fake_drafter = LLMStrategyDrafter(
        client=FakeInstructorClient(DeclinedOutcome(reason="No block supports tracking tweets.")),
        model="claude-sonnet-4-6",
    )
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: fake_drafter)

    response = client.post(
        "/strategies/draft-from-nl",
        json={"nl_text": "buy when Elon tweets", "asset": "BTC/USDT", "timeframe": "1d"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["outcome"] == "declined"
    assert body["strategy_id"] is None
    assert body["reason"] == "No block supports tracking tweets."

    assert session.exec(select(Strategy).where(Strategy.user_id == user.id)).first() is None
    assert session.exec(select(StrategyDraft)).first() is None


def test_draft_from_nl_validator_invalid_persists_nothing(client, auth_headers, session, user, monkeypatch):
    """A `drafted` IR that compiles but fails the Strategy validator (here:
    an entry condition with no exit) is mapped to the same refusal shape,
    reusing the validator's plain-language message."""
    from app.schemas.strategy_draft_ir import DraftedBlockIR, DraftedConnectionIR, DraftedIR, DraftedOutcome
    from app.services.strategy_drafter import LLMStrategyDrafter

    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)

    fake_ir = DraftedIR(
        blocks=[
            DraftedBlockIR(ref="rsi", type="rsi", label="RSI (14)", params={"period": 14, "source": "close"}),
            DraftedBlockIR(ref="oversold", type="constant", label="Oversold (30)", params={"value": 30}),
            DraftedBlockIR(ref="entry_compare", type="compare", label="RSI < 30", params={"operator": "<"}),
            DraftedBlockIR(ref="entry", type="entry_signal", label="Entry Signal", params={}),
        ],
        connections=[
            DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="entry_compare", to_port="left"),
            DraftedConnectionIR(from_ref="oversold", from_port="output", to_ref="entry_compare", to_port="right"),
            DraftedConnectionIR(from_ref="entry_compare", from_port="output", to_ref="entry", to_port="signal"),
        ],
    )
    fake_drafter = LLMStrategyDrafter(
        client=FakeInstructorClient(DraftedOutcome(ir=fake_ir)), model="claude-sonnet-4-6"
    )
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: fake_drafter)

    response = client.post(
        "/strategies/draft-from-nl",
        json={"nl_text": "buy when RSI drops below 30", "asset": "BTC/USDT", "timeframe": "1d"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["outcome"] == "declined"
    assert body["strategy_id"] is None
    assert body["reason"] == "Add at least one exit rule (Exit Signal, Stop Loss, Take Profit, etc.)."

    assert session.exec(select(Strategy).where(Strategy.user_id == user.id)).first() is None
    assert session.exec(select(StrategyDraft)).first() is None


def test_draft_from_nl_compile_error_persists_nothing(client, auth_headers, session, user, monkeypatch):
    """A `drafted` IR the GraphCompiler can't expand (unknown ref) is also
    mapped to the refusal shape and persists nothing."""
    from app.schemas.strategy_draft_ir import DraftedBlockIR, DraftedConnectionIR, DraftedIR, DraftedOutcome
    from app.services.strategy_drafter import LLMStrategyDrafter

    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)

    fake_ir = DraftedIR(
        blocks=[DraftedBlockIR(ref="rsi", type="rsi", label="RSI (14)", params={"period": 14})],
        connections=[
            DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="missing", to_port="signal"),
        ],
    )
    fake_drafter = LLMStrategyDrafter(
        client=FakeInstructorClient(DraftedOutcome(ir=fake_ir)), model="claude-sonnet-4-6"
    )
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: fake_drafter)

    response = client.post(
        "/strategies/draft-from-nl",
        json={"nl_text": "buy when RSI drops below 30", "asset": "BTC/USDT", "timeframe": "1d"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["outcome"] == "declined"
    assert body["strategy_id"] is None
    assert "missing" in body["reason"]

    assert session.exec(select(Strategy).where(Strategy.user_id == user.id)).first() is None
    assert session.exec(select(StrategyDraft)).first() is None


# ── slice 5: infra-failure path — timeout/provider error -> retryable ────
#
# Provider timeouts, 5xx/rate-limit/auth errors, and exhausted instructor
# schema-retries map to the envelope's *error* path (HTTP error response),
# distinct from the `declined` refusal (`success: true`). Nothing persists,
# and no provider/key/exception detail leaks to the client.

def test_draft_from_nl_infra_failure_returns_error_and_persists_nothing(
    client, auth_headers, session, user, monkeypatch
):
    from app.services.strategy_drafter import StrategyDrafterError

    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)

    class _RaisingDrafter:
        def draft(self, nl_text: str):
            raise StrategyDrafterError("Couldn't draft a strategy right now. Please try again in a moment.")

    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: _RaisingDrafter())

    response = client.post(
        "/strategies/draft-from-nl",
        json={"nl_text": "buy when RSI drops below 30", "asset": "BTC/USDT", "timeframe": "1d"},
        headers=auth_headers,
    )

    assert response.status_code == 503
    body = response.json()
    assert "try again" in body["detail"].lower()
    # No internal/provider detail leaks to the client.
    assert "anthropic" not in body["detail"].lower()
    assert "openai" not in body["detail"].lower()
    assert "api key" not in body["detail"].lower()

    assert session.exec(select(Strategy).where(Strategy.user_id == user.id)).first() is None
    assert session.exec(select(StrategyDraft)).first() is None


# ── issue #625: the repair pass (ADR-0015) ────────────────────────────────
#
# A draft that compiles but fails the validator gets one error-informed
# `redraft` attempt (default `strategy_drafter_max_repairs = 1`) before
# falling through to `declined`. Repair is always LLM re-generation — these
# fakes are small, intention-named `StrategyDrafter` doubles, not
# `unittest.mock` scripting.

_VALID_RSI_BOUNCE_IR = DraftedIR(
    blocks=[
        DraftedBlockIR(ref="rsi", type="rsi", label="RSI (14)", params={"period": 14, "source": "close"}),
        DraftedBlockIR(ref="oversold", type="constant", label="Oversold (30)", params={"value": 30}),
        DraftedBlockIR(ref="overbought", type="constant", label="Overbought (70)", params={"value": 70}),
        DraftedBlockIR(ref="entry_compare", type="compare", label="RSI < 30", params={"operator": "<"}),
        DraftedBlockIR(ref="exit_compare", type="compare", label="RSI > 70", params={"operator": ">"}),
        DraftedBlockIR(ref="entry", type="entry_signal", label="Entry Signal", params={}),
        DraftedBlockIR(ref="exit", type="exit_signal", label="Exit Signal", params={}),
    ],
    connections=[
        DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="entry_compare", to_port="left"),
        DraftedConnectionIR(from_ref="oversold", from_port="output", to_ref="entry_compare", to_port="right"),
        DraftedConnectionIR(from_ref="entry_compare", from_port="output", to_ref="entry", to_port="signal"),
        DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="exit_compare", to_port="left"),
        DraftedConnectionIR(from_ref="overbought", from_port="output", to_ref="exit_compare", to_port="right"),
        DraftedConnectionIR(from_ref="exit_compare", from_port="output", to_ref="exit", to_port="signal"),
    ],
)

# Entry only, no exit -> fails the validator's MISSING_EXIT check.
_INVALID_NO_EXIT_IR = DraftedIR(
    blocks=[
        DraftedBlockIR(ref="rsi", type="rsi", label="RSI (14)", params={"period": 14, "source": "close"}),
        DraftedBlockIR(ref="oversold", type="constant", label="Oversold (30)", params={"value": 30}),
        DraftedBlockIR(ref="entry_compare", type="compare", label="RSI < 30", params={"operator": "<"}),
        DraftedBlockIR(ref="entry", type="entry_signal", label="Entry Signal", params={}),
    ],
    connections=[
        DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="entry_compare", to_port="left"),
        DraftedConnectionIR(from_ref="oversold", from_port="output", to_ref="entry_compare", to_port="right"),
        DraftedConnectionIR(from_ref="entry_compare", from_port="output", to_ref="entry", to_port="signal"),
    ],
)


class DraftsInvalidThenValid:
    """First draft fails the validator (no exit); the repair pass fixes it."""

    def draft(self, nl_text: str):
        return DraftedOutcome(ir=_INVALID_NO_EXIT_IR), TokenUsage(input_tokens=100, output_tokens=50)

    def redraft(self, nl_text: str, prior_ir, errors):
        return DraftedOutcome(ir=_VALID_RSI_BOUNCE_IR), TokenUsage(input_tokens=80, output_tokens=30)


class DraftsInvalidTwice:
    """Both the first draft and the repair pass fail the validator (no exit)."""

    def draft(self, nl_text: str):
        return DraftedOutcome(ir=_INVALID_NO_EXIT_IR), TokenUsage(input_tokens=100, output_tokens=50)

    def redraft(self, nl_text: str, prior_ir, errors):
        return DraftedOutcome(ir=_INVALID_NO_EXIT_IR), TokenUsage(input_tokens=80, output_tokens=30)


def test_draft_from_nl_repair_needing_draft_returns_success(client, auth_headers, session, user, monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: DraftsInvalidThenValid())

    response = client.post(
        "/strategies/draft-from-nl",
        json={"nl_text": "buy when RSI drops below 30", "asset": "BTC/USDT", "timeframe": "1d"},
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

    draft = session.exec(select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)).first()
    assert draft is not None
    block_types = {b["type"] for b in draft.definition_json["blocks"]}
    assert "exit_signal" in block_types


def test_draft_from_nl_repair_exhausted_draft_returns_declined(client, auth_headers, session, user, monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: DraftsInvalidTwice())

    response = client.post(
        "/strategies/draft-from-nl",
        json={"nl_text": "buy when RSI drops below 30", "asset": "BTC/USDT", "timeframe": "1d"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["outcome"] == "declined"
    assert body["strategy_id"] is None
    assert body["reason"] == "Add at least one exit rule (Exit Signal, Stop Loss, Take Profit, etc.)."

    assert session.exec(select(Strategy).where(Strategy.user_id == user.id)).first() is None
    assert session.exec(select(StrategyDraft)).first() is None


# ── issue #626: repair-resolution telemetry (clean | repaired | declined) ──
#
# Server-side aggregate signal, emitted once per draft-from-nl request as a
# structured log on `app.api.strategies` — orthogonal to Draft outcome, not
# a client `nl_draft_*` event. Reuses the repair-loop test doubles above.

def _resolution_log_records(caplog):
    return [r for r in caplog.records if r.message == "strategy_draft_resolution"]


def test_draft_from_nl_clean_draft_logs_clean_resolution(client, auth_headers, session, user, monkeypatch, caplog):
    """The first draft validates with no repair call -> `clean`."""
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)

    with caplog.at_level("INFO", logger="app.api.strategies"):
        response = client.post(
            "/strategies/draft-from-nl",
            json={"nl_text": "buy when RSI is oversold", "asset": "BTC/USDT", "timeframe": "1d"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert response.json()["outcome"] == "success"

    records = _resolution_log_records(caplog)
    assert len(records) == 1
    assert records[0].resolution == "clean"


def test_draft_from_nl_repaired_draft_logs_repaired_resolution(client, auth_headers, session, user, monkeypatch, caplog):
    """An invalid first draft that a repair turns valid -> `repaired`."""
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: DraftsInvalidThenValid())

    with caplog.at_level("INFO", logger="app.api.strategies"):
        response = client.post(
            "/strategies/draft-from-nl",
            json={"nl_text": "buy when RSI drops below 30", "asset": "BTC/USDT", "timeframe": "1d"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert response.json()["outcome"] == "success"

    records = _resolution_log_records(caplog)
    assert len(records) == 1
    assert records[0].resolution == "repaired"


def test_draft_from_nl_repair_exhausted_logs_declined_resolution(client, auth_headers, session, user, monkeypatch, caplog):
    """A repair-exhausted decline -> `declined`."""
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: DraftsInvalidTwice())

    with caplog.at_level("INFO", logger="app.api.strategies"):
        response = client.post(
            "/strategies/draft-from-nl",
            json={"nl_text": "buy when RSI drops below 30", "asset": "BTC/USDT", "timeframe": "1d"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert response.json()["outcome"] == "declined"

    records = _resolution_log_records(caplog)
    assert len(records) == 1
    assert records[0].resolution == "declined"


# ── issue #632: anti-abuse ceiling (ADR-0016) ─────────────────────────────
#
# A per-user Redis fixed-window counter on POST /strategies/draft-from-nl.
# The counter increments on entry, so success, declined, and infra-failure
# all consume one unit; a draft-plus-repair is one unit. Tripping the
# ceiling returns 429, parallel to the existing 503 infra path -- not folded
# into the 200 `outcome` union.

_DRAFT_PAYLOAD = {"nl_text": "buy when RSI is oversold", "asset": "BTC/USDT", "timeframe": "1d"}


def test_draft_from_nl_requests_under_limit_unaffected(client, auth_headers, session, user, monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr(settings, "strategy_drafter_max_per_window", 5)

    for _ in range(5):
        response = client.post("/strategies/draft-from-nl", json=_DRAFT_PAYLOAD, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["outcome"] == "success"


def test_draft_from_nl_returns_429_once_limit_exceeded(client, auth_headers, session, user, monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr(settings, "strategy_drafter_max_per_window", 1)

    first = client.post("/strategies/draft-from-nl", json=_DRAFT_PAYLOAD, headers=auth_headers)
    assert first.status_code == 200
    assert first.json()["outcome"] == "success"

    second = client.post("/strategies/draft-from-nl", json=_DRAFT_PAYLOAD, headers=auth_headers)
    assert second.status_code == 429
    body = second.json()
    assert "try again" in body["detail"].lower()


def test_draft_from_nl_disabled_path_does_not_consume_ceiling(client, auth_headers, session, user, monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", False)
    monkeypatch.setattr(settings, "strategy_drafter_max_per_window", 1)

    for _ in range(3):
        response = client.post("/strategies/draft-from-nl", json=_DRAFT_PAYLOAD, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["outcome"] == "disabled"


def test_draft_from_nl_declined_outcome_consumes_ceiling(client, auth_headers, session, user, monkeypatch):
    from app.schemas.strategy_draft_ir import DeclinedOutcome
    from app.services.strategy_drafter import LLMStrategyDrafter

    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr(settings, "strategy_drafter_max_per_window", 1)

    fake_drafter = LLMStrategyDrafter(
        client=FakeInstructorClient(DeclinedOutcome(reason="No block supports tracking tweets.")),
        model="claude-sonnet-4-6",
    )
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: fake_drafter)

    payload = {"nl_text": "buy when Elon tweets", "asset": "BTC/USDT", "timeframe": "1d"}

    first = client.post("/strategies/draft-from-nl", json=payload, headers=auth_headers)
    assert first.status_code == 200
    assert first.json()["outcome"] == "declined"

    second = client.post("/strategies/draft-from-nl", json=payload, headers=auth_headers)
    assert second.status_code == 429


def test_draft_from_nl_infra_failure_consumes_ceiling(client, auth_headers, session, user, monkeypatch):
    from app.services.strategy_drafter import StrategyDrafterError

    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr(settings, "strategy_drafter_max_per_window", 1)

    class _RaisingDrafter:
        def draft(self, nl_text: str):
            raise StrategyDrafterError("Couldn't draft a strategy right now. Please try again in a moment.")

    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: _RaisingDrafter())

    first = client.post("/strategies/draft-from-nl", json=_DRAFT_PAYLOAD, headers=auth_headers)
    assert first.status_code == 503

    second = client.post("/strategies/draft-from-nl", json=_DRAFT_PAYLOAD, headers=auth_headers)
    assert second.status_code == 429


def test_draft_from_nl_repair_pass_consumes_exactly_one_unit(client, auth_headers, session, user, monkeypatch):
    """A draft-plus-repair run (ADR-0015) is one request -> one unit, not two."""
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr(settings, "strategy_drafter_max_per_window", 1)
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: DraftsInvalidThenValid())

    payload = {"nl_text": "buy when RSI drops below 30", "asset": "BTC/USDT", "timeframe": "1d"}

    first = client.post("/strategies/draft-from-nl", json=payload, headers=auth_headers)
    assert first.status_code == 200
    assert first.json()["outcome"] == "success"

    second = client.post("/strategies/draft-from-nl", json=payload, headers=auth_headers)
    assert second.status_code == 429


def test_draft_from_nl_model_declined_logs_declined_resolution(client, auth_headers, session, user, monkeypatch, caplog):
    """A model-declined first draft (no repair attempted) -> `declined`."""
    from app.schemas.strategy_draft_ir import DeclinedOutcome
    from app.services.strategy_drafter import LLMStrategyDrafter

    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)

    fake_drafter = LLMStrategyDrafter(
        client=FakeInstructorClient(DeclinedOutcome(reason="No block supports tracking tweets.")),
        model="claude-sonnet-4-6",
    )
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: fake_drafter)

    with caplog.at_level("INFO", logger="app.api.strategies"):
        response = client.post(
            "/strategies/draft-from-nl",
            json={"nl_text": "buy when Elon tweets", "asset": "BTC/USDT", "timeframe": "1d"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert response.json()["outcome"] == "declined"

    records = _resolution_log_records(caplog)
    assert len(records) == 1
    assert records[0].resolution == "declined"


# ── issue #633: per-request token cost observability (ADR-0016 §4) ───────
#
# Exactly one structured cost log line per draft-from-nl request, beside the
# `strategy_draft_resolution` line: input/output tokens, model, provider,
# resolution, repair_count.

def _token_usage_log_records(caplog):
    return [r for r in caplog.records if r.message == "strategy_draft_token_usage"]


def test_draft_from_nl_stub_drafter_logs_zero_token_usage(client, auth_headers, session, user, monkeypatch, caplog):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)

    with caplog.at_level("INFO", logger="app.api.strategies"):
        response = client.post(
            "/strategies/draft-from-nl",
            json={"nl_text": "buy when RSI is oversold", "asset": "BTC/USDT", "timeframe": "1d"},
            headers=auth_headers,
        )

    assert response.status_code == 200

    records = _token_usage_log_records(caplog)
    assert len(records) == 1
    record = records[0]
    assert record.input_tokens == 0
    assert record.output_tokens == 0
    assert record.model == settings.strategy_drafter_model
    assert record.provider == settings.strategy_drafter_provider
    assert record.resolution == "clean"
    assert record.repair_count == 0


def test_draft_from_nl_llm_drafter_logs_token_usage_from_completion(
    client, auth_headers, session, user, monkeypatch, caplog
):
    from types import SimpleNamespace

    from app.schemas.strategy_draft_ir import DraftedOutcome
    from app.services.strategy_drafter import LLMStrategyDrafter

    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)

    completion = SimpleNamespace(usage=SimpleNamespace(input_tokens=120, output_tokens=80))
    fake_drafter = LLMStrategyDrafter(
        client=FakeInstructorClient(DraftedOutcome(ir=_VALID_RSI_BOUNCE_IR), completion=completion),
        model="claude-sonnet-4-6",
    )
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: fake_drafter)

    with caplog.at_level("INFO", logger="app.api.strategies"):
        response = client.post(
            "/strategies/draft-from-nl",
            json={"nl_text": "buy when RSI is oversold", "asset": "BTC/USDT", "timeframe": "1d"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert response.json()["outcome"] == "success"

    records = _token_usage_log_records(caplog)
    assert len(records) == 1
    record = records[0]
    assert record.input_tokens == 120
    assert record.output_tokens == 80
    assert record.resolution == "clean"
    assert record.repair_count == 0


def test_draft_from_nl_repaired_draft_logs_summed_token_usage(
    client, auth_headers, session, user, monkeypatch, caplog
):
    """draft + repair usage sum into one cost log line (ADR-0016 §4)."""
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: DraftsInvalidThenValid())

    with caplog.at_level("INFO", logger="app.api.strategies"):
        response = client.post(
            "/strategies/draft-from-nl",
            json={"nl_text": "buy when RSI drops below 30", "asset": "BTC/USDT", "timeframe": "1d"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert response.json()["outcome"] == "success"

    records = _token_usage_log_records(caplog)
    assert len(records) == 1
    record = records[0]
    assert record.input_tokens == 180  # 100 (draft) + 80 (repair)
    assert record.output_tokens == 80  # 50 (draft) + 30 (repair)
    assert record.resolution == "repaired"
    assert record.repair_count == 1


def test_draft_from_nl_declined_draft_logs_token_usage(client, auth_headers, session, user, monkeypatch, caplog):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr("app.api.strategies.get_strategy_drafter", lambda: DraftsInvalidTwice())

    with caplog.at_level("INFO", logger="app.api.strategies"):
        response = client.post(
            "/strategies/draft-from-nl",
            json={"nl_text": "buy when RSI drops below 30", "asset": "BTC/USDT", "timeframe": "1d"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert response.json()["outcome"] == "declined"

    records = _token_usage_log_records(caplog)
    assert len(records) == 1
    record = records[0]
    assert record.input_tokens == 180
    assert record.output_tokens == 80
    assert record.resolution == "declined"
    assert record.repair_count == 1
