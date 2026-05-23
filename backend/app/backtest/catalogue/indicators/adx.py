"""ADX (Average Directional Index) indicator block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest import indicators
from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, ParamSpec, PortSpec

_SPEC = BlockSpec(
    type="adx",
    category="indicator",
    label="ADX",
    inputs=(),
    outputs=(
        PortSpec(name="output", label="Output (ADX)"),
        PortSpec(name="adx", label="ADX"),
        PortSpec(name="plus_di", label="+DI"),
        PortSpec(name="minus_di", label="-DI"),
    ),
    params=(
        ParamSpec(name="period", label="Period", kind="int", default=14, min=1, max=100),
    ),
)


class AdxHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        period = int(ctx.params.get("period", 14))
        highs = ctx.candle_data["high"]
        lows = ctx.candle_data["low"]
        closes = ctx.candle_data["close"]
        adx_line, plus_di, minus_di = indicators.adx(highs, lows, closes, period)
        return {
            "output": adx_line,
            "adx": adx_line,
            "plus_di": plus_di,
            "minus_di": minus_di,
        }

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        issues: list[Issue] = []
        period = params.get("period", 14)

        if not isinstance(period, (int, float)) or not 1 <= period <= 100:
            issues.append(Issue(
                code="INVALID_PERIOD",
                message=f"ADX period must be 1-100, got {period}",
                user_message="Period must be between 1 and 100.",
            ))

        return issues
