"""OR block handler for the block catalogue."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest.catalogue.types import BlockContext, BlockSpec, Issue, PortSpec


def _to_bool(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return bool(value)


_SPEC = BlockSpec(
    type="or",
    category="logic",
    label="OR",
    inputs=(
        PortSpec(name="a", label="A"),
        PortSpec(name="b", label="B"),
    ),
    outputs=(PortSpec(name="output", label="Output"),),
    params=(),
)


class OrHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        a = ctx.input("a", [False] * ctx.n)
        b = ctx.input("b", [False] * ctx.n)
        return {"output": [_to_bool(a[i]) or _to_bool(b[i]) for i in range(ctx.n)]}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        return []
