"""Tests for graph_compiler service — pure unit, zero I/O.

Modeled on test_strategy_validation.py: fixed IR in, asserted canonical
Working-copy definition out. The compiler mints block ids, resolves Ports
from the Block Catalogue, assigns layout positions, and builds the
connection structure the validator/canvas consume (ADR-0011).
"""
import inspect

import pytest

from app.schemas.strategy_draft_ir import DraftedBlockIR, DraftedConnectionIR, DraftedIR


# ── module purity check ──────────────────────────────────────────────────

def test_graph_compiler_has_no_forbidden_imports():
    import app.services.graph_compiler as mod

    src = inspect.getsource(mod)
    assert "from fastapi" not in src
    assert "from sqlmodel" not in src
    assert "from app.db" not in src


# ── id minting & connection structure ───────────────────────────────────

def test_compile_graph_mints_ids_and_resolves_connection():
    from app.services.graph_compiler import compile_graph

    ir = DraftedIR(
        blocks=[
            DraftedBlockIR(ref="rsi", type="rsi", params={"period": 14, "source": "close"}),
            DraftedBlockIR(ref="threshold", type="compare", params={"operator": "<"}),
        ],
        connections=[
            DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="threshold", to_port="left"),
        ],
    )

    definition = compile_graph(ir)

    block_ids = {b["id"] for b in definition["blocks"]}
    assert len(block_ids) == 2  # ids minted, unique

    rsi_block = next(b for b in definition["blocks"] if b["type"] == "rsi")
    compare_block = next(b for b in definition["blocks"] if b["type"] == "compare")

    assert len(definition["connections"]) == 1
    conn = definition["connections"][0]
    assert conn["from_port"] == {"block_id": rsi_block["id"], "port": "output"}
    assert conn["to_port"] == {"block_id": compare_block["id"], "port": "left"}


# ── id minting: same type appears twice ──────────────────────────────────

def test_compile_graph_mints_distinct_ids_for_same_type():
    from app.services.graph_compiler import compile_graph

    ir = DraftedIR(
        blocks=[
            DraftedBlockIR(ref="oversold", type="constant", params={"value": 30}),
            DraftedBlockIR(ref="overbought", type="constant", params={"value": 70}),
        ],
        connections=[],
    )

    definition = compile_graph(ir)

    ids = [b["id"] for b in definition["blocks"]]
    assert len(ids) == len(set(ids)) == 2


# ── layout: positions assigned and deterministic ─────────────────────────

def test_compile_graph_assigns_distinct_positions():
    from app.services.graph_compiler import compile_graph

    ir = DraftedIR(
        blocks=[
            DraftedBlockIR(ref="rsi", type="rsi", params={"period": 14}),
            DraftedBlockIR(ref="threshold", type="compare", params={"operator": "<"}),
            DraftedBlockIR(ref="entry", type="entry_signal", params={}),
        ],
        connections=[],
    )

    definition = compile_graph(ir)

    positions = [(b["position"]["x"], b["position"]["y"]) for b in definition["blocks"]]
    assert len(set(positions)) == 3
    for b in definition["blocks"]:
        assert isinstance(b["position"]["x"], (int, float))
        assert isinstance(b["position"]["y"], (int, float))


def test_compile_graph_is_deterministic():
    from app.services.graph_compiler import compile_graph

    ir = DraftedIR(
        blocks=[
            DraftedBlockIR(ref="rsi", type="rsi", params={"period": 14}),
            DraftedBlockIR(ref="threshold", type="compare", params={"operator": "<"}),
        ],
        connections=[
            DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="threshold", to_port="left"),
        ],
    )

    assert compile_graph(ir) == compile_graph(ir)


# ── port resolution: invalid port references are rejected ────────────────

def test_compile_graph_rejects_unknown_output_port():
    from app.services.graph_compiler import GraphCompilationError, compile_graph

    ir = DraftedIR(
        blocks=[
            DraftedBlockIR(ref="rsi", type="rsi", params={"period": 14}),
            DraftedBlockIR(ref="threshold", type="compare", params={"operator": "<"}),
        ],
        connections=[
            DraftedConnectionIR(from_ref="rsi", from_port="not_a_port", to_ref="threshold", to_port="left"),
        ],
    )

    with pytest.raises(GraphCompilationError):
        compile_graph(ir)


def test_compile_graph_rejects_unknown_input_port():
    from app.services.graph_compiler import GraphCompilationError, compile_graph

    ir = DraftedIR(
        blocks=[
            DraftedBlockIR(ref="rsi", type="rsi", params={"period": 14}),
            DraftedBlockIR(ref="threshold", type="compare", params={"operator": "<"}),
        ],
        connections=[
            DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="threshold", to_port="not_a_port"),
        ],
    )

    with pytest.raises(GraphCompilationError):
        compile_graph(ir)


def test_compile_graph_rejects_connection_to_unknown_ref():
    from app.services.graph_compiler import GraphCompilationError, compile_graph

    ir = DraftedIR(
        blocks=[
            DraftedBlockIR(ref="rsi", type="rsi", params={"period": 14}),
        ],
        connections=[
            DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="missing", to_port="left"),
        ],
    )

    with pytest.raises(GraphCompilationError):
        compile_graph(ir)


# ── risk blocks: out of catalogue scope, no ports to resolve ─────────────

def test_compile_graph_includes_risk_block_without_ports():
    from app.services.graph_compiler import compile_graph

    ir = DraftedIR(
        blocks=[
            DraftedBlockIR(ref="sl", type="stop_loss", params={"stop_loss_pct": 5}),
        ],
        connections=[],
    )

    definition = compile_graph(ir)

    assert len(definition["blocks"]) == 1
    block = definition["blocks"][0]
    assert block["type"] == "stop_loss"
    assert block["params"] == {"stop_loss_pct": 5}
    assert "id" in block and "position" in block


# ── labels & params pass through ──────────────────────────────────────────

def test_compile_graph_uses_catalogue_label_when_not_provided():
    from app.services.graph_compiler import compile_graph

    ir = DraftedIR(
        blocks=[DraftedBlockIR(ref="rsi", type="rsi", params={"period": 14})],
        connections=[],
    )

    definition = compile_graph(ir)
    assert definition["blocks"][0]["label"] == "RSI"


def test_compile_graph_preserves_explicit_label():
    from app.services.graph_compiler import compile_graph

    ir = DraftedIR(
        blocks=[DraftedBlockIR(ref="rsi", type="rsi", label="RSI (14)", params={"period": 14})],
        connections=[],
    )

    definition = compile_graph(ir)
    assert definition["blocks"][0]["label"] == "RSI (14)"


# ── overall shape matches StrategyDefinitionValidate ─────────────────────

def test_compile_graph_output_validates_against_definition_schema():
    from app.schemas.strategy import StrategyDefinitionValidate
    from app.services.graph_compiler import compile_graph

    ir = DraftedIR(
        blocks=[
            DraftedBlockIR(ref="rsi", type="rsi", params={"period": 14, "source": "close"}),
            DraftedBlockIR(ref="threshold", type="constant", params={"value": 30}),
            DraftedBlockIR(ref="compare", type="compare", params={"operator": "<"}),
            DraftedBlockIR(ref="entry", type="entry_signal", params={}),
        ],
        connections=[
            DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="compare", to_port="left"),
            DraftedConnectionIR(from_ref="threshold", from_port="output", to_ref="compare", to_port="right"),
            DraftedConnectionIR(from_ref="compare", from_port="output", to_ref="entry", to_port="signal"),
        ],
    )

    definition = compile_graph(ir)

    # Must round-trip through the same schema the validator and PUT /draft use.
    StrategyDefinitionValidate.model_validate(definition)
