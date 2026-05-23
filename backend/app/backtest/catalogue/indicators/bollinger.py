"""Bollinger Bands indicator block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest import indicators
from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, ParamSpec, PortSpec

_SPEC = BlockSpec(
    type="bollinger",
    category="indicator",
    label="Bollinger Bands",
    inputs=(),
    outputs=(
        PortSpec(name="output", label="Output (Middle Band)"),
        PortSpec(name="upper", label="Upper Band"),
        PortSpec(name="middle", label="Middle Band"),
        PortSpec(name="lower", label="Lower Band"),
    ),
    params=(
        ParamSpec(name="source", label="Price Source", kind="enum", default="close",
                  options=("open", "high", "low", "close", "prev_close")),
        ParamSpec(name="period", label="Period", kind="int", default=20, min=1, max=500),
        ParamSpec(name="stddev", label="Std Dev Multiplier", kind="float", default=2.0, min=0.5, max=5.0),
    ),
)


class BollingerHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        period = int(ctx.params.get("period", 20))
        std_dev = float(ctx.params.get("stddev", 2.0))
        series = ctx.source_series()
        upper, middle, lower = indicators.bollinger(series, period, std_dev)
        return {
            "output": middle,
            "upper": upper,
            "middle": middle,
            "lower": lower,
        }

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        issues: list[Issue] = []
        period = params.get("period", 20)
        std_dev = params.get("stddev", 2.0)

        if not isinstance(period, (int, float)) or not 1 <= period <= 500:
            issues.append(Issue(
                code="INVALID_PERIOD",
                message=f"Bollinger period must be 1-500, got {period}",
                user_message="Period must be between 1 and 500.",
            ))
        if not isinstance(std_dev, (int, float)) or std_dev <= 0:
            issues.append(Issue(
                code="INVALID_STDDEV",
                message=f"Bollinger std dev multiplier must be > 0, got {std_dev}",
                user_message="Standard deviation multiplier must be greater than 0.",
            ))

        return issues
