"""Ichimoku Cloud indicator block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest import indicators
from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, ParamSpec, PortSpec

_SPEC = BlockSpec(
    type="ichimoku",
    category="indicator",
    label="Ichimoku Cloud",
    inputs=(),
    outputs=(
        PortSpec(name="output", label="Output"),
        PortSpec(name="conversion", label="Conversion"),
        PortSpec(name="base", label="Base"),
        PortSpec(name="span_a", label="Span A"),
        PortSpec(name="span_b", label="Span B"),
    ),
    params=(
        ParamSpec(name="conversion", label="Conversion Period", kind="int", default=9, min=1, max=100),
        ParamSpec(name="base", label="Base Period", kind="int", default=26, min=1, max=200),
        ParamSpec(name="span_b", label="Span B Period", kind="int", default=52, min=1, max=200),
        ParamSpec(name="displacement", label="Displacement", kind="int", default=26, min=1, max=100),
    ),
)


class IchimokuHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        conversion = int(ctx.params.get("conversion", 9))
        base = int(ctx.params.get("base", 26))
        span_b = int(ctx.params.get("span_b", 52))
        displacement = int(ctx.params.get("displacement", 26))
        highs = ctx.candle_data["high"]
        lows = ctx.candle_data["low"]
        closes = ctx.candle_data["close"]
        conv_line, base_line, span_a, span_b_line = indicators.ichimoku(
            highs, lows, closes, conversion, base, span_b, displacement
        )
        return {
            "output": conv_line,
            "conversion": conv_line,
            "base": base_line,
            "span_a": span_a,
            "span_b": span_b_line,
        }

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        return []
