"""Price Variation % indicator block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest import indicators
from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, PortSpec

_SPEC = BlockSpec(
    type="price_variation_pct",
    category="indicator",
    label="Price Variation %",
    inputs=(),
    outputs=(PortSpec(name="output", label="Output"),),
    params=(),
)


class PriceVariationPctHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        return {"output": indicators.price_variation_pct(ctx.candle_data["close"])}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        return []
