"""Tests for drafter_vocabulary service — pure unit, zero I/O.

Modeled on test_strategy_validation.py: fixed catalogue/risk-block specs in,
asserted vocabulary projections out.
"""
import inspect

import pytest


# ── module purity check ──────────────────────────────────────────────────

def test_drafter_vocabulary_has_no_forbidden_imports():
    import app.services.drafter_vocabulary as mod

    src = inspect.getsource(mod)
    assert "from fastapi" not in src
    assert "from sqlmodel" not in src
    assert "from app.db" not in src


# ── catalogue ∪ risk-block coverage ──────────────────────────────────────

def test_vocabulary_is_union_of_catalogue_and_risk_blocks():
    from app.backtest.catalogue import CATALOGUE
    from app.services.drafter_vocabulary import RISK_BLOCK_SPECS, vocabulary_block_types

    assert set(vocabulary_block_types()) == set(CATALOGUE) | set(RISK_BLOCK_SPECS)


@pytest.mark.parametrize("risk_type", [
    "position_size", "take_profit", "stop_loss", "max_drawdown", "time_exit", "trailing_stop",
])
def test_risk_blocks_are_draftable(risk_type):
    from app.services.drafter_vocabulary import vocabulary_block_types

    assert risk_type in vocabulary_block_types()


def test_risk_blocks_are_not_in_the_block_catalogue():
    from app.backtest.catalogue import CATALOGUE
    from app.services.drafter_vocabulary import RISK_BLOCK_SPECS

    assert set(RISK_BLOCK_SPECS).isdisjoint(CATALOGUE)


@pytest.mark.parametrize("catalogue_type", [
    "rsi", "sma", "ema", "constant", "price", "compare", "crossover", "entry_signal", "exit_signal",
])
def test_catalogue_blocks_are_draftable(catalogue_type):
    from app.services.drafter_vocabulary import vocabulary_block_types

    assert catalogue_type in vocabulary_block_types()


# ── per-type param shapes match ParamSpec ────────────────────────────────

def test_catalogue_block_param_specs_match_block_spec():
    from app.backtest.catalogue import CATALOGUE
    from app.services.drafter_vocabulary import vocabulary_param_specs

    for block_type, handler in CATALOGUE.items():
        assert vocabulary_param_specs(block_type) == handler.spec.params


def test_risk_block_param_specs_match_risk_block_specs():
    from app.services.drafter_vocabulary import RISK_BLOCK_SPECS, vocabulary_param_specs

    for block_type, spec in RISK_BLOCK_SPECS.items():
        assert vocabulary_param_specs(block_type) == spec.params


def test_unknown_block_type_has_no_param_specs():
    from app.services.drafter_vocabulary import vocabulary_param_specs

    assert vocabulary_param_specs("not_a_real_block") == ()


def test_param_with_no_bounds_renders_kind_and_default(monkeypatch):
    from app.backtest.catalogue import CATALOGUE
    from app.backtest.catalogue.types import BlockSpec, ParamSpec, PortSpec
    from app.services.drafter_vocabulary import render_prompt_vocabulary

    fake_spec = BlockSpec(
        type="gadget",
        category="indicator",
        label="Gadget",
        inputs=(),
        outputs=(PortSpec(name="output", label="Output"),),
        params=(ParamSpec(name="label", label="Label", kind="str", default="x"),),
    )

    class FakeHandler:
        spec = fake_spec

    monkeypatch.setitem(CATALOGUE, "gadget", FakeHandler())

    assert "label: str (default x)" in render_prompt_vocabulary()


# ── prompt vocabulary ─────────────────────────────────────────────────────

def test_prompt_vocabulary_lists_every_block_type():
    from app.services.drafter_vocabulary import render_prompt_vocabulary, vocabulary_block_types

    prompt = render_prompt_vocabulary()

    for block_type in vocabulary_block_types():
        assert f"- {block_type} " in prompt


def test_prompt_vocabulary_includes_descriptions_and_param_shapes():
    from app.services.drafter_vocabulary import render_prompt_vocabulary

    prompt = render_prompt_vocabulary()

    assert "Use to detect overbought" in prompt  # rsi description
    assert "period: int 2-100 (default 14)" in prompt  # rsi param shape


# ── new-block-auto-appears property ──────────────────────────────────────

def test_new_catalogue_block_appears_in_vocabulary_and_prompt(monkeypatch):
    from app.backtest.catalogue import CATALOGUE
    from app.backtest.catalogue.types import BlockSpec, ParamSpec, PortSpec
    from app.services.drafter_vocabulary import render_prompt_vocabulary, vocabulary_block_types

    fake_spec = BlockSpec(
        type="widget",
        category="indicator",
        label="Widget",
        inputs=(),
        outputs=(PortSpec(name="output", label="Output"),),
        params=(ParamSpec(name="factor", label="Factor", kind="int", default=1, min=1, max=10),),
    )

    class FakeHandler:
        spec = fake_spec

    monkeypatch.setitem(CATALOGUE, "widget", FakeHandler())

    assert "widget" in vocabulary_block_types()
    assert "- widget (Widget):" in render_prompt_vocabulary()
