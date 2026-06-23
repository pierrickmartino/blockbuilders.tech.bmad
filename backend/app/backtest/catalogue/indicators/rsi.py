"""RSI indicator block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest import indicators
from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, ParamSpec, PortSpec

_SPEC = BlockSpec(
    type="rsi",
    category="indicator",
    label="RSI",
    inputs=(),
    outputs=(PortSpec(name="output", label="Output", explain="RSI({period})"),),
    params=(
        ParamSpec(name="period", label="Period", kind="int", default=14, min=2, max=100),
        ParamSpec(
            name="source",
            label="Source",
            kind="enum",
            default="close",
            options=("open", "high", "low", "close", "prev_close", "volume"),
        ),
    ),
)


class RsiHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        period = int(ctx.params.get("period", 14))
        return {"output": indicators.rsi(ctx.source_series(), period)}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        period = params.get("period", 14)
        if not isinstance(period, (int, float)) or not 2 <= period <= 100:
            return [Issue(
                code="INVALID_PERIOD",
                message=f"RSI period must be 2-100, got {period}",
                user_message="RSI period must be between 2 and 100.",
                help_link="/docs/blocks/rsi",
            )]
        return []
