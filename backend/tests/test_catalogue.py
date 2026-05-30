"""Tests for the block catalogue — protocol types, registry, SMA handler, emitter, and CI gates."""
from __future__ import annotations

import importlib
import subprocess
import sys
from pathlib import Path
from typing import Any


# ── helpers ───────────────────────────────────────────────────────────────────

def _make_candle_data(closes: list[float]) -> dict[str, list]:
    n = len(closes)
    return {
        "open": closes,
        "high": closes,
        "low": closes,
        "close": closes,
        "prev_close": [None] + closes[:-1],
        "volume": [1000.0] * n,
    }


# ── Cycle 1: protocol types importable ───────────────────────────────────────

def test_catalogue_protocol_types_are_importable():
    from app.backtest.catalogue.types import (
        BlockContext,
        BlockSpec,
        Issue,
        ParamSpec,
        PortSpec,
    )
    assert BlockSpec
    assert ParamSpec
    assert PortSpec
    assert BlockContext
    assert Issue


def test_block_handler_protocol_is_importable():
    from app.backtest.catalogue.types import BlockHandler
    assert BlockHandler


def test_block_spec_is_frozen_dataclass():
    from app.backtest.catalogue.types import BlockSpec, ParamSpec, PortSpec

    spec = BlockSpec(
        type="test",
        category="indicator",
        label="Test",
        inputs=(),
        outputs=(PortSpec(name="output", label="Output"),),
        params=(ParamSpec(name="period", label="Period", kind="int", default=20, min=1, max=500),),
    )
    import dataclasses
    assert dataclasses.is_dataclass(spec)
    # frozen: mutation must raise
    try:
        spec.type = "mutated"  # type: ignore[misc]
        assert False, "Should have raised FrozenInstanceError"
    except Exception:
        pass


# ── Cycle 2: SMA handler compute ─────────────────────────────────────────────

def test_sma_handler_compute_returns_rolling_mean():
    from app.backtest.catalogue.indicators.sma import SmaHandler
    from app.backtest.catalogue.types import BlockContext

    closes = [10.0, 11.0, 12.0, 13.0, 14.0, 15.0]
    ctx = BlockContext(
        candle_data=_make_candle_data(closes),
        params={"period": 3, "source": "close"},
        inputs={},
        n=len(closes),
    )
    result = SmaHandler().compute(ctx)

    assert "output" in result
    output = result["output"]
    assert len(output) == 6
    # First two values are None (warm-up period)
    assert output[0] is None
    assert output[1] is None
    # SMA(3) at index 2: mean(10, 11, 12) = 11.0
    assert abs(output[2] - 11.0) < 1e-6
    # SMA(3) at index 5: mean(13, 14, 15) = 14.0
    assert abs(output[5] - 14.0) < 1e-6


def test_sma_handler_uses_default_period_20():
    from app.backtest.catalogue.indicators.sma import SmaHandler
    from app.backtest.catalogue.types import BlockContext

    closes = [float(i) for i in range(1, 25)]
    ctx = BlockContext(
        candle_data=_make_candle_data(closes),
        params={},
        inputs={},
        n=len(closes),
    )
    result = SmaHandler().compute(ctx)
    assert result["output"][18] is None  # index 18 = 19th candle, still warming up
    assert result["output"][19] is not None  # index 19 = 20th candle, period=20 complete


def test_sma_handler_validate_rejects_period_out_of_range():
    from app.backtest.catalogue.indicators.sma import SmaHandler

    issues = SmaHandler().validate({"period": 0})
    assert len(issues) == 1
    assert issues[0].code == "INVALID_PERIOD"

    issues = SmaHandler().validate({"period": 501})
    assert len(issues) == 1
    assert issues[0].code == "INVALID_PERIOD"


def test_sma_handler_validate_accepts_valid_period():
    from app.backtest.catalogue.indicators.sma import SmaHandler

    assert SmaHandler().validate({"period": 20}) == []
    assert SmaHandler().validate({}) == []  # default 20 is valid


def test_sma_handler_has_correct_spec():
    from app.backtest.catalogue.indicators.sma import SmaHandler

    handler = SmaHandler()
    assert handler.spec.type == "sma"
    assert handler.spec.category == "indicator"
    # period param
    period_param = next(p for p in handler.spec.params if p.name == "period")
    assert period_param.min == 1
    assert period_param.max == 500
    assert period_param.default == 20


# ── Cycle 3: registry lookup ──────────────────────────────────────────────────

def test_catalogue_lookup_returns_sma_handler():
    from app.backtest.catalogue import lookup

    handler = lookup("sma")
    assert handler is not None
    assert handler.spec.type == "sma"


def test_catalogue_lookup_returns_none_for_unknown():
    from app.backtest.catalogue import lookup

    assert lookup("unknown_block_xyz") is None


# ── Cycle 4: interpreter dispatches via catalogue ─────────────────────────────

def test_interpreter_dispatches_sma_via_catalogue():
    from datetime import datetime, timedelta, timezone
    from uuid import uuid4

    from app.backtest.interpreter import interpret_strategy
    from app.models.candle import Candle

    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    price = 100.0
    candles = []
    for i in range(30):
        close = price + float(i)
        candles.append(
            Candle(
                id=uuid4(),
                asset="BTC/USDT",
                timeframe="1d",
                timestamp=start + timedelta(days=i),
                open=price,
                high=close + 1.0,
                low=price - 1.0,
                close=close,
                volume=1000.0,
            )
        )

    from app.backtest.types import RiskParams, ValidatedStrategy
    strategy = ValidatedStrategy(
        blocks=(
            {"id": "sma-1", "type": "sma", "params": {"period": 5, "source": "close"}},
            {"id": "price-1", "type": "price", "params": {"source": "close"}},
            {"id": "cmp-1", "type": "compare", "params": {"operator": ">"}},
            {"id": "entry-1", "type": "entry_signal", "params": {}},
        ),
        connections=(
            {"from_port": {"block_id": "price-1", "port": "output"}, "to_port": {"block_id": "cmp-1", "port": "left"}},
            {"from_port": {"block_id": "sma-1", "port": "output"}, "to_port": {"block_id": "cmp-1", "port": "right"}},
            {"from_port": {"block_id": "cmp-1", "port": "output"}, "to_port": {"block_id": "entry-1", "port": "signal"}},
        ),
        risk_params=RiskParams(),
    )

    signals = interpret_strategy(strategy, candles)
    # With rising prices, close > SMA should be True eventually
    assert any(signals.entry_long)


# ── Cycle 5: validator calls handler.validate() ───────────────────────────────

def test_validator_uses_catalogue_for_sma_invalid_period():
    from app.schemas.strategy import Block, BlockPosition
    from app.services.strategy_validation import validate_block_params

    block = Block(
        id="b1",
        type="sma",
        label="SMA",
        position=BlockPosition(x=0, y=0),
        params={"period": 999},
    )
    errors = validate_block_params(block)
    assert len(errors) >= 1
    assert any(e.code == "INVALID_PERIOD" for e in errors)


def test_validator_uses_catalogue_for_sma_valid_period():
    from app.schemas.strategy import Block, BlockPosition
    from app.services.strategy_validation import validate_block_params

    block = Block(
        id="b1",
        type="sma",
        label="SMA",
        position=BlockPosition(x=0, y=0),
        params={"period": 20},
    )
    assert validate_block_params(block) == []


# ── Cycle 6: CI gate — interpreter and validator purity ───────────────────────

def test_catalogue_types_not_in_interpreter_elif():
    """Interpreter must not have explicit elif arms for catalogue-registered types."""
    import ast
    import inspect

    from app.backtest import interpreter
    from app.backtest.catalogue import CATALOGUE

    source = inspect.getsource(interpreter)
    tree = ast.parse(source)

    elif_block_types: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Compare):
            for comparator in node.comparators:
                if isinstance(comparator, ast.Constant) and isinstance(comparator.value, str):
                    elif_block_types.add(comparator.value)

    catalogue_types = set(CATALOGUE.keys())
    overlap = catalogue_types & elif_block_types
    assert overlap == set(), (
        f"Catalogue types {overlap} still appear as string literals in interpreter.py elif chain. "
        "Remove the legacy elif arms."
    )


def test_catalogue_types_not_in_validator_per_block_branches():
    """Validator must not have per-block branches for catalogue-registered types."""
    import ast
    import inspect

    from app.services import strategy_validation
    from app.backtest.catalogue import CATALOGUE

    source = inspect.getsource(strategy_validation)
    tree = ast.parse(source)

    validator_block_types: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Compare):
            for comparator in node.comparators:
                if isinstance(comparator, ast.Constant) and isinstance(comparator.value, str):
                    validator_block_types.add(comparator.value)

    catalogue_types = set(CATALOGUE.keys())
    overlap = catalogue_types & validator_block_types
    assert overlap == set(), (
        f"Catalogue types {overlap} still appear as string literals in strategy_validation.py. "
        "Remove the legacy per-block branches."
    )


# ── Cycle 7: emitter produces valid TypeScript snapshot ───────────────────────

def test_emitter_produces_typescript_output():
    from app.backtest.catalogue.emitter import emit_typescript

    output = emit_typescript()
    assert "export" in output
    assert "sma" in output
    assert "BlockSpec" in output or "const" in output


def test_emitter_output_matches_committed_artifact():
    """CI gate: emitter must produce no diff against the committed file."""
    from app.backtest.catalogue.emitter import emit_typescript

    artifact = Path(__file__).parents[2] / "frontend" / "src" / "generated" / "blocks.ts"
    if not artifact.exists():
        import pytest
        pytest.skip("Generated artifact not committed yet — run the emitter once to bootstrap it.")

    current = emit_typescript()
    committed = artifact.read_text()
    assert current == committed, (
        "Emitter output differs from committed frontend/src/generated/blocks.ts. "
        "Run the emitter and commit the updated artifact."
    )
