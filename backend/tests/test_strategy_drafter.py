"""Tests for strategy_drafter service — pure unit, zero I/O.

Modeled on test_graph_compiler.py. Slice 1 (issue #584) ships a stub
StrategyDrafter that always returns a fixed `drafted` IR — no LLM, no API
key. The seam (Protocol + factory) is what later slices swap the real
provider into (ADR-0011, sibling of Price Provider ADR-0003).
"""
import inspect

import pytest


# ── module purity check ──────────────────────────────────────────────────

def test_strategy_drafter_has_no_forbidden_imports():
    import app.services.strategy_drafter as mod

    src = inspect.getsource(mod)
    assert "from fastapi" not in src
    assert "from sqlmodel" not in src
    assert "from app.db" not in src


# ── stub drafter: always returns a drafted outcome ───────────────────────

def test_stub_drafter_returns_drafted_outcome():
    from app.schemas.strategy_draft_ir import DraftedOutcome
    from app.services.strategy_drafter import StubStrategyDrafter

    result = StubStrategyDrafter().draft("buy when RSI is oversold")

    assert isinstance(result, DraftedOutcome)
    assert result.outcome == "drafted"
    assert len(result.ir.blocks) > 0


# ── determinism: same input -> same IR ────────────────────────────────────

def test_stub_drafter_is_deterministic():
    from app.services.strategy_drafter import StubStrategyDrafter

    drafter = StubStrategyDrafter()
    first = drafter.draft("buy when RSI is oversold")
    second = drafter.draft("buy when RSI is oversold")

    assert first.model_dump() == second.model_dump()


# ── factory ────────────────────────────────────────────────────────────────

def test_get_strategy_drafter_returns_stub_drafter():
    from app.services.strategy_drafter import StubStrategyDrafter, get_strategy_drafter

    drafter = get_strategy_drafter()

    assert isinstance(drafter, StubStrategyDrafter)


# ── the stub IR compiles and validates cleanly ────────────────────────────

def test_stub_drafter_ir_compiles_and_validates():
    from app.schemas.strategy import StrategyDefinitionValidate
    from app.services.graph_compiler import compile_graph
    from app.services.strategy_drafter import StubStrategyDrafter
    from app.services.strategy_validation import collect_validation_errors

    result = StubStrategyDrafter().draft("buy when RSI is oversold")

    definition = compile_graph(result.ir)
    parsed = StrategyDefinitionValidate.model_validate(definition)

    errors = collect_validation_errors(parsed)
    assert errors == []


# ── LLM drafter: fake provider (no real LLM calls) ────────────────────────

class _FakeCompletions:
    def __init__(self, result, calls):
        self._result = result
        self._calls = calls

    def create(self, **kwargs):
        self._calls.append(kwargs)
        return self._result


class _FakeChat:
    def __init__(self, result, calls):
        self.completions = _FakeCompletions(result, calls)


class FakeInstructorClient:
    """Mimics instructor's `client.chat.completions.create(...)` interface."""

    def __init__(self, result):
        self.calls: list[dict] = []
        self.chat = _FakeChat(result, self.calls)


class _FakeRaisingCompletions:
    def __init__(self, exc, calls):
        self._exc = exc
        self._calls = calls

    def create(self, **kwargs):
        self._calls.append(kwargs)
        raise self._exc


class FakeRaisingInstructorClient:
    """Mimics a provider/instructor call that raises before returning."""

    def __init__(self, exc):
        self.calls: list[dict] = []
        self.chat = _FakeChat(None, self.calls)
        self.chat.completions = _FakeRaisingCompletions(exc, self.calls)


def test_llm_drafter_returns_drafted_outcome_from_fake_provider():
    from app.schemas.strategy_draft_ir import DraftedBlockIR, DraftedIR, DraftedOutcome
    from app.services.strategy_drafter import LLMStrategyDrafter

    ir = DraftedIR(
        blocks=[DraftedBlockIR(ref="rsi", type="rsi", params={"period": 14})],
        connections=[],
    )
    fake_result = DraftedOutcome(ir=ir)
    client = FakeInstructorClient(fake_result)

    drafter = LLMStrategyDrafter(client=client, model="claude-sonnet-4-6")
    result = drafter.draft("buy when RSI is oversold")

    assert result is fake_result


def test_llm_drafter_calls_provider_with_response_model_and_nl_text():
    from app.schemas.strategy_draft_ir import DraftedIR, DraftedOutcome, DraftResult
    from app.services.strategy_drafter import LLMStrategyDrafter

    fake_result = DraftedOutcome(ir=DraftedIR(blocks=[], connections=[]))
    client = FakeInstructorClient(fake_result)

    drafter = LLMStrategyDrafter(client=client, model="claude-sonnet-4-6")
    drafter.draft("buy when RSI is oversold")

    assert len(client.calls) == 1
    call = client.calls[0]
    assert call["model"] == "claude-sonnet-4-6"
    assert call["response_model"] is DraftResult
    assert any("buy when RSI is oversold" in m["content"] for m in call["messages"])


def test_llm_drafter_passes_through_declined_outcome():
    from app.schemas.strategy_draft_ir import DeclinedOutcome
    from app.services.strategy_drafter import LLMStrategyDrafter

    fake_result = DeclinedOutcome(reason="No block supports that indicator.")
    client = FakeInstructorClient(fake_result)

    drafter = LLMStrategyDrafter(client=client, model="claude-sonnet-4-6")
    result = drafter.draft("buy when the moon is full")

    assert result.outcome == "declined"
    assert result.reason == "No block supports that indicator."


def test_llm_drafter_passes_configured_timeout_to_provider_call(monkeypatch):
    from app.core.config import settings
    from app.schemas.strategy_draft_ir import DraftedIR, DraftedOutcome
    from app.services.strategy_drafter import LLMStrategyDrafter

    monkeypatch.setattr(settings, "strategy_drafter_timeout_seconds", 12.5)

    fake_result = DraftedOutcome(ir=DraftedIR(blocks=[], connections=[]))
    client = FakeInstructorClient(fake_result)

    drafter = LLMStrategyDrafter(client=client, model="claude-sonnet-4-6")
    drafter.draft("buy when RSI is oversold")

    assert client.calls[0]["timeout"] == 12.5


# ── infra-failure mapping: timeout/5xx/rate-limit/auth/retry-exhaustion ───
#
# These map to `StrategyDrafterError`, distinct from a `declined` refusal:
# the endpoint maps this to the envelope's error path (issue #589).

def test_llm_drafter_raises_strategy_drafter_error_on_provider_timeout():
    import httpx
    import anthropic

    from app.services.strategy_drafter import LLMStrategyDrafter, StrategyDrafterError

    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    client = FakeRaisingInstructorClient(anthropic.APITimeoutError(request=request))

    drafter = LLMStrategyDrafter(client=client, model="claude-sonnet-4-6")

    with pytest.raises(StrategyDrafterError):
        drafter.draft("buy when RSI is oversold")


def test_llm_drafter_raises_strategy_drafter_error_on_rate_limit():
    import httpx
    import openai

    from app.services.strategy_drafter import LLMStrategyDrafter, StrategyDrafterError

    request = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
    response = httpx.Response(429, request=request)
    client = FakeRaisingInstructorClient(
        openai.RateLimitError("rate limited", response=response, body=None)
    )

    drafter = LLMStrategyDrafter(client=client, model="gpt-4o")

    with pytest.raises(StrategyDrafterError):
        drafter.draft("buy when RSI is oversold")


def test_llm_drafter_raises_strategy_drafter_error_on_retry_exhaustion():
    from instructor.core import InstructorRetryException

    from app.services.strategy_drafter import LLMStrategyDrafter, StrategyDrafterError

    client = FakeRaisingInstructorClient(
        InstructorRetryException("schema retries exhausted", n_attempts=3, total_usage=0)
    )

    drafter = LLMStrategyDrafter(client=client, model="claude-sonnet-4-6")

    with pytest.raises(StrategyDrafterError):
        drafter.draft("buy when RSI is oversold")


def test_strategy_drafter_error_message_does_not_leak_provider_detail():
    import httpx
    import anthropic

    from app.services.strategy_drafter import LLMStrategyDrafter, StrategyDrafterError

    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    secret_detail = "sk-ant-super-secret-key-12345"
    client = FakeRaisingInstructorClient(
        anthropic.APIError(secret_detail, request=request, body=None)
    )

    drafter = LLMStrategyDrafter(client=client, model="claude-sonnet-4-6")

    with pytest.raises(StrategyDrafterError) as exc_info:
        drafter.draft("buy when RSI is oversold")

    assert secret_detail not in str(exc_info.value)


# ── factory: switches between stub and LLM drafter based on config ───────

def test_get_strategy_drafter_returns_llm_drafter_when_api_key_configured(monkeypatch):
    from app.core.config import settings
    from app.services.strategy_drafter import LLMStrategyDrafter, get_strategy_drafter

    monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test-key")
    monkeypatch.setattr(settings, "strategy_drafter_model", "claude-sonnet-4-6")

    drafter = get_strategy_drafter()

    assert isinstance(drafter, LLMStrategyDrafter)
    assert drafter._model == "claude-sonnet-4-6"


# ── factory: provider-agnostic client selection (ADR-0011, issue #588) ───

def test_get_strategy_drafter_builds_anthropic_client_for_anthropic_provider(monkeypatch):
    import anthropic

    from app.core.config import settings
    from app.services.strategy_drafter import LLMStrategyDrafter, get_strategy_drafter

    monkeypatch.setattr(settings, "strategy_drafter_provider", "anthropic")
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test-key")
    monkeypatch.setattr(settings, "openai_api_key", "")
    monkeypatch.setattr(settings, "openrouter_api_key", "")
    monkeypatch.setattr(settings, "strategy_drafter_base_url", "")

    drafter = get_strategy_drafter()

    assert isinstance(drafter, LLMStrategyDrafter)
    assert isinstance(drafter._client.client, anthropic.Anthropic)


def test_get_strategy_drafter_builds_openai_client_for_openai_provider(monkeypatch):
    import openai

    from app.core.config import settings
    from app.services.strategy_drafter import LLMStrategyDrafter, get_strategy_drafter

    monkeypatch.setattr(settings, "strategy_drafter_provider", "openai")
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    monkeypatch.setattr(settings, "openai_api_key", "sk-openai-test-key")
    monkeypatch.setattr(settings, "openrouter_api_key", "")
    monkeypatch.setattr(settings, "strategy_drafter_base_url", "")

    drafter = get_strategy_drafter()

    assert isinstance(drafter, LLMStrategyDrafter)
    assert isinstance(drafter._client.client, openai.OpenAI)
    assert str(drafter._client.client.base_url) == "https://api.openai.com/v1/"


def test_get_strategy_drafter_builds_openrouter_client_with_default_base_url(monkeypatch):
    import openai

    from app.core.config import settings
    from app.services.strategy_drafter import LLMStrategyDrafter, get_strategy_drafter

    monkeypatch.setattr(settings, "strategy_drafter_provider", "openrouter")
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    monkeypatch.setattr(settings, "openai_api_key", "")
    monkeypatch.setattr(settings, "openrouter_api_key", "sk-or-test-key")
    monkeypatch.setattr(settings, "strategy_drafter_base_url", "")

    drafter = get_strategy_drafter()

    assert isinstance(drafter, LLMStrategyDrafter)
    assert isinstance(drafter._client.client, openai.OpenAI)
    assert str(drafter._client.client.base_url) == "https://openrouter.ai/api/v1/"


def test_get_strategy_drafter_uses_configured_base_url_override(monkeypatch):
    from app.core.config import settings
    from app.services.strategy_drafter import LLMStrategyDrafter, get_strategy_drafter

    monkeypatch.setattr(settings, "strategy_drafter_provider", "anthropic")
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test-key")
    monkeypatch.setattr(settings, "openai_api_key", "")
    monkeypatch.setattr(settings, "openrouter_api_key", "")
    monkeypatch.setattr(settings, "strategy_drafter_base_url", "https://proxy.example.com")

    drafter = get_strategy_drafter()

    assert isinstance(drafter, LLMStrategyDrafter)
    assert str(drafter._client.client.base_url) == "https://proxy.example.com"


def test_get_strategy_drafter_returns_stub_when_selected_provider_key_missing(monkeypatch):
    from app.core.config import settings
    from app.services.strategy_drafter import StubStrategyDrafter, get_strategy_drafter

    monkeypatch.setattr(settings, "strategy_drafter_provider", "openai")
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-present-but-unused")
    monkeypatch.setattr(settings, "openai_api_key", "")
    monkeypatch.setattr(settings, "openrouter_api_key", "")

    drafter = get_strategy_drafter()

    assert isinstance(drafter, StubStrategyDrafter)
