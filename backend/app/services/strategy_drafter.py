"""StrategyDrafter — turns NL text into a semantic IR (ADR-0011).

Pure, deterministic, zero I/O. Slice 1 ships only `StubStrategyDrafter`,
which ignores `nl_text` and always returns the same `drafted` IR (an
RSI-oversold-bounce style strategy). This proves the
NL box → drafter → GraphCompiler → validator → persist → canvas walking
skeleton without an LLM or API key.

`StrategyDrafter` is the seam later slices swap a real LLM-backed
implementation into — sibling of the Price Provider seam (ADR-0003).
"""
from __future__ import annotations

from typing import Protocol

from app.schemas.strategy_draft_ir import (
    DraftedBlockIR,
    DraftedConnectionIR,
    DraftedIR,
    DraftedOutcome,
    DraftResult,
)


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


def get_strategy_drafter() -> StrategyDrafter:
    return StubStrategyDrafter()
