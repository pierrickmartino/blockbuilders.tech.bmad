"""Stochastic Oscillator indicator block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest import indicators
from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, ParamSpec, PortSpec

_SPEC = BlockSpec(
    type="stochastic",
    category="indicator",
    label="Stochastic Oscillator",
    inputs=(),
    outputs=(
        PortSpec(name="output", label="Output (%K)", explain="Stochastic %K({k_period},{d_period},{smooth})"),
        PortSpec(name="k", label="%K Line", explain="Stochastic %K({k_period},{d_period},{smooth})"),
        PortSpec(name="d", label="%D Line", explain="Stochastic %D({k_period},{d_period},{smooth})"),
    ),
    params=(
        ParamSpec(name="k_period", label="K Period", kind="int", default=14, min=1, max=100),
        ParamSpec(name="d_period", label="D Period", kind="int", default=3, min=1, max=50),
        ParamSpec(name="smooth", label="Smooth K", kind="int", default=3, min=1, max=20),
    ),
)


class StochasticHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        k_period = int(ctx.params.get("k_period", 14))
        d_period = int(ctx.params.get("d_period", 3))
        smooth = int(ctx.params.get("smooth", 3))
        highs = ctx.candle_data["high"]
        lows = ctx.candle_data["low"]
        closes = ctx.candle_data["close"]
        k_line, d_line = indicators.stochastic(highs, lows, closes, k_period, d_period, smooth)
        return {
            "output": k_line,
            "k": k_line,
            "d": d_line,
        }

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        issues: list[Issue] = []
        k_period = params.get("k_period", 14)
        d_period = params.get("d_period", 3)
        smooth = params.get("smooth", 3)

        if not isinstance(k_period, (int, float)) or not 1 <= k_period <= 100:
            issues.append(Issue(
                code="INVALID_PARAM",
                message=f"Stochastic K period must be 1-100, got {k_period}",
                user_message="K period must be between 1 and 100.",
            ))
        if not isinstance(d_period, (int, float)) or not 1 <= d_period <= 50:
            issues.append(Issue(
                code="INVALID_PARAM",
                message=f"Stochastic D period must be 1-50, got {d_period}",
                user_message="D period must be between 1 and 50.",
            ))
        if not isinstance(smooth, (int, float)) or smooth < 1:
            issues.append(Issue(
                code="INVALID_PARAM",
                message=f"Stochastic smooth K must be >= 1, got {smooth}",
                user_message="Smooth K must be at least 1.",
            ))

        return issues
