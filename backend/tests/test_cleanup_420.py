"""RED tests for issue #420: legacy block dispatch removal.

These tests define the target clean state and were written BEFORE
the implementation changes. They fail on the old code and pass once
the cleanup is complete.
"""
import importlib
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).parents[1]
FRONTEND_ROOT = Path(__file__).parents[2] / "frontend" / "src"


# ── Cycle 1: indicator_registry.py must be gone ───────────────────────────────

def test_indicator_registry_module_is_deleted():
    """indicator_registry.py must be deleted — the catalogue is the only registry."""
    with pytest.raises(ModuleNotFoundError):
        importlib.import_module("app.backtest.indicator_registry")


# ── Cycle 2: interpreter must shed the INDICATOR_REGISTRY fallback ────────────

def test_interpreter_imports_no_indicator_registry():
    """interpreter.py must not import INDICATOR_REGISTRY or IndicatorContext."""
    source = (BACKEND_ROOT / "app" / "backtest" / "interpreter.py").read_text()
    assert "INDICATOR_REGISTRY" not in source, (
        "Remove 'INDICATOR_REGISTRY' import from interpreter.py"
    )
    assert "IndicatorContext" not in source, (
        "Remove 'IndicatorContext' import from interpreter.py"
    )


def test_interpreter_elif_chain_has_no_indicator_registry_arm():
    """The 'elif block_type in INDICATOR_REGISTRY' fallback arm must be removed."""
    source = (BACKEND_ROOT / "app" / "backtest" / "interpreter.py").read_text()
    assert "INDICATOR_REGISTRY" not in source, (
        "Delete the 'elif block_type in INDICATOR_REGISTRY' branch from get_block_output()"
    )


# ── Cycle 3: canvas.ts BLOCK_REGISTRY must use _catalogueEntry for all catalogue blocks ──

def test_canvas_ts_block_registry_has_no_hardcoded_catalogue_entries():
    """BLOCK_REGISTRY must not contain hardcoded object entries for catalogue-managed blocks.

    Catalogue blocks: all 22 non-risk types in CATALOGUE.
    Each must appear only as _catalogueEntry("type", ...), not as an inline object.
    """
    from app.backtest.catalogue import CATALOGUE

    canvas_source = (FRONTEND_ROOT / "types" / "canvas.ts").read_text()

    risk_types = frozenset(
        {"position_size", "take_profit", "stop_loss", "max_drawdown", "time_exit", "trailing_stop"}
    )
    non_risk_catalogue_types = set(CATALOGUE.keys()) - risk_types

    violations: list[str] = []
    for block_type in sorted(non_risk_catalogue_types):
        # A hardcoded inline object entry looks like: type: "macd",
        # A _catalogueEntry call looks like: _catalogueEntry("macd",
        if f'type: "{block_type}"' in canvas_source:
            violations.append(block_type)

    assert not violations, (
        f"These catalogue blocks still have hardcoded inline entries in BLOCK_REGISTRY: {violations}. "
        "Replace them with _catalogueEntry() calls."
    )


# ── Cycle 4: param-configs.ts must have no explicit switch cases for catalogue blocks ──

def test_param_configs_ts_has_no_non_risk_switch_cases():
    """param-configs.ts must not have explicit switch cases for catalogue-managed blocks.

    Only risk block cases are allowed; all catalogue blocks derive their
    param configs from the catalogue spec via the generic fallback.
    """
    from app.backtest.catalogue import CATALOGUE

    param_source = (FRONTEND_ROOT / "lib" / "param-configs.ts").read_text()

    risk_types = frozenset(
        {"position_size", "take_profit", "stop_loss", "max_drawdown", "time_exit", "trailing_stop"}
    )
    non_risk_catalogue_types = set(CATALOGUE.keys()) - risk_types

    violations: list[str] = []
    for block_type in sorted(non_risk_catalogue_types):
        if f'case "{block_type}":' in param_source:
            violations.append(block_type)

    assert not violations, (
        f"param-configs.ts has explicit switch cases for catalogue blocks: {violations}. "
        "Remove them — the generic catalogue fallback should handle these."
    )
