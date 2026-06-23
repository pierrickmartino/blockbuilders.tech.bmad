"""OBV indicator block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest import indicators
from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, PortSpec

_SPEC = BlockSpec(
    type="obv",
    category="indicator",
    label="OBV",
    inputs=(),
    outputs=(PortSpec(name="output", label="Output", explain="OBV"),),
    params=(),
)


class ObvHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        closes = ctx.candle_data["close"]
        volumes = ctx.candle_data["volume"]
        return {"output": indicators.obv(closes, volumes)}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        return []
