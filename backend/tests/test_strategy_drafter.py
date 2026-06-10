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
