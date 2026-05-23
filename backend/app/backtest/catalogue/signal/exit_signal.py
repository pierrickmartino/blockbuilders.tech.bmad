"""Exit Signal block handler for the block catalogue."""
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
    type="exit_signal",
    category="signal",
    label="Exit Signal",
    inputs=(PortSpec(name="signal", label="Signal"),),
    outputs=(PortSpec(name="output", label="Output"),),
    params=(),
)


class ExitSignalHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        data = ctx.input("signal", [False] * ctx.n)
        return {"output": [_to_bool(data[i]) for i in range(ctx.n)]}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        return []
