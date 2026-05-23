"""Volume source block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, PortSpec

_SPEC = BlockSpec(
    type="volume",
    category="input",
    label="Volume",
    inputs=(),
    outputs=(PortSpec(name="output", label="Output"),),
    params=(),
)


class VolumeHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        return {"output": ctx.candle_data["volume"]}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        return []
