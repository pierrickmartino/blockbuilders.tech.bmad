"""Fibonacci Retracement indicator block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest import indicators
from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, ParamSpec, PortSpec

_SPEC = BlockSpec(
    type="fibonacci",
    category="indicator",
    label="Fibonacci",
    inputs=(),
    outputs=(
        PortSpec(name="output", label="Output (50%)", explain="Fib 50%({lookback})"),
        PortSpec(name="level_236", label="23.6%", explain="Fib 23.6%({lookback})"),
        PortSpec(name="level_382", label="38.2%", explain="Fib 38.2%({lookback})"),
        PortSpec(name="level_5", label="50%", explain="Fib 50%({lookback})"),
        PortSpec(name="level_618", label="61.8%", explain="Fib 61.8%({lookback})"),
        PortSpec(name="level_786", label="78.6%", explain="Fib 78.6%({lookback})"),
    ),
    params=(
        ParamSpec(name="lookback", label="Lookback Period", kind="int", default=50, min=10, max=500),
    ),
)


class FibonacciHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        lookback = int(ctx.params.get("lookback", 50))
        highs = ctx.candle_data["high"]
        lows = ctx.candle_data["low"]
        level_236, level_382, level_5, level_618, level_786 = indicators.fibonacci_retracements(
            highs, lows, lookback
        )
        return {
            "output": level_5,
            "level_236": level_236,
            "level_382": level_382,
            "level_5": level_5,
            "level_618": level_618,
            "level_786": level_786,
        }

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        lookback = params.get("lookback", 50)
        if not isinstance(lookback, (int, float)) or not 10 <= lookback <= 500:
            return [Issue(
                code="INVALID_LOOKBACK",
                message=f"Lookback must be 10-500, got {lookback}",
                user_message="Fibonacci lookback must be between 10 and 500.",
                help_link="/docs/blocks/fibonacci",
            )]
        return []
