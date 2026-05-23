"""Crossover block handler for the block catalogue."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest.catalogue.types import BlockContext, BlockSpec, Issue, ParamSpec, PortSpec

_VALID_DIRECTIONS = ("crosses_above", "crosses_below")

_SPEC = BlockSpec(
    type="crossover",
    category="logic",
    label="Crossover",
    inputs=(
        PortSpec(name="fast", label="Fast"),
        PortSpec(name="slow", label="Slow"),
    ),
    outputs=(PortSpec(name="output", label="Output"),),
    params=(
        ParamSpec(
            name="direction",
            label="Direction",
            kind="enum",
            default="crosses_above",
            options=_VALID_DIRECTIONS,
        ),
    ),
)


class CrossoverHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        fast = ctx.input("fast", [0.0] * ctx.n)
        slow = ctx.input("slow", [0.0] * ctx.n)
        direction = ctx.params.get("direction", "crosses_above")

        result: list[bool] = [False]  # first candle has no previous — always False
        for i in range(1, ctx.n):
            fp = fast[i - 1] if i - 1 < len(fast) else None
            fc = fast[i] if i < len(fast) else None
            sp = slow[i - 1] if i - 1 < len(slow) else None
            sc = slow[i] if i < len(slow) else None

            if any(v is None for v in (fp, fc, sp, sc)):
                result.append(False)
                continue

            if direction == "crosses_above":
                result.append(fp <= sp and fc > sc)
            else:  # crosses_below
                result.append(fp >= sp and fc < sc)

        return {"output": result}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        direction = params.get("direction", "crosses_above")
        if direction and direction not in _VALID_DIRECTIONS:
            return [
                Issue(
                    code="INVALID_DIRECTION",
                    message=f"Unknown direction: {direction!r}",
                    user_message=f"Crossover direction '{direction}' is not supported. Use 'crosses_above' or 'crosses_below'.",
                    help_link="/docs/blocks/crossover",
                )
            ]
        return []
