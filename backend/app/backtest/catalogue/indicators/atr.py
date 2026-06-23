"""ATR indicator block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest import indicators
from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, ParamSpec, PortSpec

_SPEC = BlockSpec(
    type="atr",
    category="indicator",
    label="ATR",
    inputs=(),
    outputs=(PortSpec(name="output", label="Output", explain="ATR({period})"),),
    params=(
        ParamSpec(name="period", label="Period", kind="int", default=14, min=1, max=500),
    ),
)


class AtrHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        period = int(ctx.params.get("period", 14))
        highs = ctx.candle_data["high"]
        lows = ctx.candle_data["low"]
        closes = ctx.candle_data["close"]
        return {"output": indicators.atr(highs, lows, closes, period)}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        period = params.get("period", 14)
        if not isinstance(period, (int, float)) or not 1 <= period <= 500:
            return [Issue(
                code="INVALID_PERIOD",
                message=f"Period must be 1-500, got {period}",
                user_message="ATR period must be between 1 and 500.",
                help_link="/docs/blocks/atr",
            )]
        return []
