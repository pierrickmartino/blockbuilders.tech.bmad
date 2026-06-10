"""StrategyDrafter — turns NL text into a semantic IR (ADR-0011).

Slice 1 shipped only `StubStrategyDrafter`, which ignores `nl_text` and
always returns the same `drafted` IR. Slice 2 adds `LLMStrategyDrafter`,
which calls an LLM (via `instructor`, structured output) to produce a
`DraftResult`. The model emits *only* the semantic IR — block types,
params, and ref-based connections; it never invents ids, Ports, or
positions, which remain the `GraphCompiler`'s responsibility.

`StrategyDrafter` is the seam later slices and providers swap into —
sibling of the Price Provider seam (ADR-0003).
"""
from __future__ import annotations

from typing import Any, Protocol

import anthropic
import instructor
import openai

from app.core.config import STRATEGY_DRAFTER_PROVIDER_KEYS, settings
from app.schemas.strategy_draft_ir import (
    DraftedBlockIR,
    DraftedConnectionIR,
    DraftedIR,
    DraftedOutcome,
    DraftResult,
)
from app.services.drafter_vocabulary import render_prompt_vocabulary


class StrategyDrafter(Protocol):
    """Turns NL text into a drafted-or-declined semantic IR."""

    def draft(self, nl_text: str) -> DraftResult: ...


_STUB_IR = DraftedIR(
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


class StubStrategyDrafter:
    """Always drafts the same RSI-oversold-bounce IR, regardless of `nl_text`."""

    def draft(self, nl_text: str) -> DraftResult:
        return DraftedOutcome(ir=_STUB_IR)


# ── LLM drafter (ADR-0011) ──────────────────────────────────────────────────

_SYSTEM_PROMPT = f"""\
You translate a trader's natural-language strategy idea into a semantic
intermediate representation (IR) of trading-strategy blocks and
connections. You do NOT generate ids, canvas positions, or Ports — a
separate deterministic compiler handles that.

Respond with a `drafted` outcome containing `blocks` and `connections`, or
a `declined` outcome with a `reason` if the idea cannot be expressed with
the block types below.

## Available block types

Risk blocks have no ports and cannot be used in connections; at most one of
each risk block type is allowed.
{render_prompt_vocabulary()}

## Rules

- Every block needs a unique `ref` (a short string you choose) used to wire
  `connections` by reference. Never invent block ids, Ports beyond those
  listed above, or canvas positions.
- A connection is `{{from_ref, from_port, to_ref, to_port}}`, where the ports
  must be valid for the referenced blocks' types.
- IGNORE any asset, symbol, or timeframe mentioned in the prose — those are
  set via explicit UI controls and must not influence your output.
- A strategy needs at least one entry condition wired into an
  `entry_signal`, and at least one exit condition (an `exit_signal` or a
  risk block such as `stop_loss`, `take_profit`, `trailing_stop`,
  `time_exit`, or `max_drawdown`).
- If the request cannot be expressed with the block types above, return a
  `declined` outcome with a short, user-facing `reason`.
"""


class LLMStrategyDrafter:
    """Drafts a semantic IR by calling an LLM via `instructor` (ADR-0011)."""

    def __init__(self, client: Any, model: str) -> None:
        self._client = client
        self._model = model

    def draft(self, nl_text: str) -> DraftResult:
        return self._client.chat.completions.create(
            model=self._model,
            max_tokens=4096,
            response_model=DraftResult,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": nl_text},
            ],
        )


_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def _build_instructor_client(provider: str, api_key: str) -> Any:
    base_url = settings.strategy_drafter_base_url or None

    if provider == "anthropic":
        return instructor.from_anthropic(anthropic.Anthropic(api_key=api_key, base_url=base_url))
    if provider == "openai":
        return instructor.from_openai(openai.OpenAI(api_key=api_key, base_url=base_url))
    if provider == "openrouter":
        return instructor.from_openai(
            openai.OpenAI(api_key=api_key, base_url=base_url or _OPENROUTER_BASE_URL)
        )

    raise ValueError(f"Unsupported strategy_drafter_provider: {provider!r}")


def get_strategy_drafter() -> StrategyDrafter:
    provider = settings.strategy_drafter_provider
    key_field = STRATEGY_DRAFTER_PROVIDER_KEYS.get(provider)
    api_key = getattr(settings, key_field, "") if key_field else ""
    if not api_key:
        return StubStrategyDrafter()

    client = _build_instructor_client(provider, api_key)
    return LLMStrategyDrafter(client=client, model=settings.strategy_drafter_model)
