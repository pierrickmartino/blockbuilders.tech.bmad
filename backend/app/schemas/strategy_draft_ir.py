"""Semantic IR for the Strategy drafter (ADR-0011).

The drafter emits this *semantic* representation — which block types, their
params, and which connect to which by reference — never the canonical
Working-copy definition directly. The GraphCompiler expands an IR into the
canonical definition (mints block ids, resolves Ports, assigns layout).

The IR is a discriminated `drafted | declined` union: a first-class
`declined` arm lets the drafter say "I can't express this" rather than being
forced to emit some graph for every input.
"""
from __future__ import annotations

from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, Field

# The drafter's vocabulary: a minimal hand-listed subset of the block
# catalogue (ADR-0011). Every type here must be resolvable by
# `GraphCompiler` via `catalogue_lookup()`. Full catalogue projection is a
# future slice.
BlockType = Literal[
    "rsi",
    "sma",
    "ema",
    "constant",
    "price",
    "compare",
    "crossover",
    "entry_signal",
    "exit_signal",
    "stop_loss",
    "take_profit",
    "trailing_stop",
    "time_exit",
    "position_size",
    "max_drawdown",
]


class DraftedBlockIR(BaseModel):
    """One block in the semantic IR.

    `ref` is a drafter-local reference used to wire up connections; the
    GraphCompiler mints the real block id and never reuses `ref` as one.
    """

    ref: str
    type: BlockType
    label: str | None = None
    params: dict[str, Any] = Field(default_factory=dict)


class DraftedConnectionIR(BaseModel):
    """One connection in the semantic IR, expressed by block `ref`."""

    from_ref: str
    from_port: str
    to_ref: str
    to_port: str


class DraftedIR(BaseModel):
    """The semantic graph: blocks and connections by reference."""

    blocks: list[DraftedBlockIR]
    connections: list[DraftedConnectionIR]


class DraftedOutcome(BaseModel):
    """The drafter produced a candidate graph."""

    outcome: Literal["drafted"] = "drafted"
    ir: DraftedIR


class DeclinedOutcome(BaseModel):
    """The drafter could not express the request with the available blocks."""

    outcome: Literal["declined"] = "declined"
    reason: str


DraftResult = Annotated[Union[DraftedOutcome, DeclinedOutcome], Field(discriminator="outcome")]
