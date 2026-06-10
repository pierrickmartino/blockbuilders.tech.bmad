"""Tests for the Strategy drafter semantic IR schema (ADR-0011).

`DraftedBlockIR.type` is constrained to a minimal hand-listed vocabulary of
block types the drafter is allowed to emit. This keeps the LLM's output
space small and ensures every emitted block type is one `GraphCompiler` can
resolve via the catalogue.
"""
import pytest
from pydantic import ValidationError


def test_drafted_block_ir_rejects_unknown_block_type():
    from app.schemas.strategy_draft_ir import DraftedBlockIR

    with pytest.raises(ValidationError):
        DraftedBlockIR(ref="x", type="not_a_real_block_type", params={})


def test_drafted_block_ir_accepts_known_block_type():
    from app.schemas.strategy_draft_ir import DraftedBlockIR

    block = DraftedBlockIR(ref="rsi", type="rsi", params={"period": 14})

    assert block.type == "rsi"
