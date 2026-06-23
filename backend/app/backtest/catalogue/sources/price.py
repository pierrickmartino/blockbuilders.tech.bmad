"""Price source block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, ParamSpec, PortSpec

_SPEC = BlockSpec(
    type="price",
    category="input",
    label="Price",
    inputs=(),
    outputs=(PortSpec(name="output", label="Output", explain="{source} price"),),
    params=(
        ParamSpec(
            name="source",
            label="Price Source",
            kind="enum",
            default="close",
            options=("open", "high", "low", "close", "prev_close", "volume"),
        ),
    ),
)


class PriceHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        source = ctx.params.get("source", "close")
        return {"output": ctx.candle_data.get(source, ctx.candle_data["close"])}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        return []
