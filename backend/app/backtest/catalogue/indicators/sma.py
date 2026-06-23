"""SMA block handler for the block catalogue."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest import indicators
from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, ParamSpec, PortSpec

_SPEC = BlockSpec(
    type="sma",
    category="indicator",
    label="SMA",
    inputs=(),
    outputs=(PortSpec(name="output", label="Output", explain="the {period}-day SMA"),),
    params=(
        ParamSpec(
            name="period",
            label="Period",
            kind="int",
            default=20,
            min=1,
            max=500,
        ),
        ParamSpec(
            name="source",
            label="Source",
            kind="enum",
            default="close",
            options=("open", "high", "low", "close", "prev_close", "volume"),
        ),
    ),
)


class SmaHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        period = int(ctx.params.get("period", 20))
        result = indicators.sma(ctx.source_series(), period)
        return {"output": result}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        period = params.get("period", 20)
        if not isinstance(period, (int, float)) or not 1 <= period <= 500:
            return [
                Issue(
                    code="INVALID_PERIOD",
                    message=f"Period must be 1-500, got {period}",
                    user_message="SMA period must be between 1 and 500.",
                    help_link="/docs/blocks/sma",
                )
            ]
        return []
