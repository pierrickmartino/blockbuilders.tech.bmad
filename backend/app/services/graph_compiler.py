"""GraphCompiler — expands a drafted semantic IR into a canonical Working-copy
definition (ADR-0011).

Pure, deterministic, zero I/O — safe to unit test without any app context.
Mints block ids, resolves Ports from the Block Catalogue, assigns layout
positions, and builds the connection structure the Strategy validator and
canvas consume. The drafter never hand-authors ids, port references, or
positions; this module is where those mechanical details are produced.
"""
from __future__ import annotations

from typing import Any

from app.backtest.catalogue import lookup as catalogue_lookup
from app.schemas.strategy_draft_ir import DraftedIR

# Layout columns by BlockSpec.category. Risk blocks (out of catalogue scope,
# CONTEXT.md) have no category and get their own trailing column.
_CATEGORY_COLUMN_X: dict[str, int] = {
    "input": 100,
    "indicator": 100,
    "logic": 300,
    "signal": 500,
}
_RISK_COLUMN_X = 700
_ROW_HEIGHT = 150
_ROW_START_Y = 100


class GraphCompilationError(Exception):
    """Raised when a drafted IR references a block, port, or ref the
    Block Catalogue cannot resolve. The IR is untrusted (ADR-0011); this
    is the compiler asserting its own invariants, not a user-facing error."""


def _column_x(block_type: str) -> int:
    handler = catalogue_lookup(block_type)
    if handler is None:
        return _RISK_COLUMN_X
    return _CATEGORY_COLUMN_X.get(handler.spec.category, _RISK_COLUMN_X)


def compile_graph(ir: DraftedIR) -> dict[str, Any]:
    """Expand a semantic IR into a canonical Working-copy definition dict.

    Assumes the IR is well-formed (a `drafted` outcome); raises
    GraphCompilationError if a connection references an unknown block ref
    or a port not present on that block type's catalogue spec.
    """
    ref_to_id: dict[str, str] = {}
    type_counters: dict[str, int] = {}
    column_counts: dict[int, int] = {}
    blocks: list[dict[str, Any]] = []

    for ir_block in ir.blocks:
        type_counters[ir_block.type] = type_counters.get(ir_block.type, 0) + 1
        block_id = f"{ir_block.type}-{type_counters[ir_block.type]}"
        ref_to_id[ir_block.ref] = block_id

        handler = catalogue_lookup(ir_block.type)
        label = ir_block.label or (handler.spec.label if handler else ir_block.type)

        x = _column_x(ir_block.type)
        row = column_counts.get(x, 0)
        column_counts[x] = row + 1
        y = _ROW_START_Y + row * _ROW_HEIGHT

        blocks.append(
            {
                "id": block_id,
                "type": ir_block.type,
                "label": label,
                "position": {"x": x, "y": y},
                "params": dict(ir_block.params),
            }
        )

    connections: list[dict[str, Any]] = []
    for ir_conn in ir.connections:
        from_id = _resolve_ref(ir_conn.from_ref, ref_to_id)
        to_id = _resolve_ref(ir_conn.to_ref, ref_to_id)

        from_type = next(b["type"] for b in blocks if b["id"] == from_id)
        to_type = next(b["type"] for b in blocks if b["id"] == to_id)

        _resolve_port(from_type, ir_conn.from_port, "outputs")
        _resolve_port(to_type, ir_conn.to_port, "inputs")

        connections.append(
            {
                "from_port": {"block_id": from_id, "port": ir_conn.from_port},
                "to_port": {"block_id": to_id, "port": ir_conn.to_port},
            }
        )

    return {"blocks": blocks, "connections": connections, "meta": {}}


def _resolve_ref(ref: str, ref_to_id: dict[str, str]) -> str:
    if ref not in ref_to_id:
        raise GraphCompilationError(f"Connection references unknown block ref: {ref!r}")
    return ref_to_id[ref]


def _resolve_port(block_type: str, port: str, direction: str) -> None:
    handler = catalogue_lookup(block_type)
    if handler is None:
        raise GraphCompilationError(
            f"Block type {block_type!r} is not in the Block Catalogue and cannot have ports"
        )
    ports = getattr(handler.spec, direction)
    if port not in {p.name for p in ports}:
        raise GraphCompilationError(
            f"Block type {block_type!r} has no {direction[:-1]} port named {port!r}"
        )
