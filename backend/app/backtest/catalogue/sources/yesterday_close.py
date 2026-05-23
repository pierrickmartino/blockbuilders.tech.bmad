"""Yesterday Close source block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, PortSpec

_SPEC = BlockSpec(
    type="yesterday_close",
    category="input",
    label="Yesterday Close",
    inputs=(),
    outputs=(PortSpec(name="output", label="Output"),),
    params=(),
)


class YesterdayCloseHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        closes = ctx.candle_data["close"]
        return {"output": [None] + closes[:-1]}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        return []
