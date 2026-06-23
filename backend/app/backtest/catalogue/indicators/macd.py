"""MACD indicator block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest import indicators
from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, ParamSpec, PortSpec

_SPEC = BlockSpec(
    type="macd",
    category="indicator",
    label="MACD",
    inputs=(),
    outputs=(
        PortSpec(name="output", label="Output (MACD Line)", explain="MACD({fast_period},{slow_period},{signal_period})"),
        PortSpec(name="macd", label="MACD Line", explain="MACD({fast_period},{slow_period},{signal_period})"),
        PortSpec(name="signal", label="Signal Line", explain="MACD signal({fast_period},{slow_period},{signal_period})"),
        PortSpec(name="histogram", label="Histogram", explain="MACD histogram({fast_period},{slow_period},{signal_period})"),
    ),
    params=(
        ParamSpec(name="source", label="Price Source", kind="enum", default="close",
                  options=("open", "high", "low", "close", "prev_close")),
        ParamSpec(name="fast_period", label="Fast Period", kind="int", default=12, min=1, max=50),
        ParamSpec(name="slow_period", label="Slow Period", kind="int", default=26, min=1, max=200),
        ParamSpec(name="signal_period", label="Signal Period", kind="int", default=9, min=1, max=50),
    ),
)


class MacdHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        fast = int(ctx.params.get("fast_period", 12))
        slow = int(ctx.params.get("slow_period", 26))
        signal = int(ctx.params.get("signal_period", 9))
        series = ctx.source_series()
        macd_line, signal_line, histogram = indicators.macd(series, fast, slow, signal)
        return {
            "output": macd_line,
            "macd": macd_line,
            "signal": signal_line,
            "histogram": histogram,
        }

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        issues: list[Issue] = []
        fast = params.get("fast_period", 12)
        slow = params.get("slow_period", 26)
        signal = params.get("signal_period", 9)

        if not isinstance(fast, (int, float)) or not 1 <= fast <= 50:
            issues.append(Issue(
                code="INVALID_PARAM",
                message=f"MACD fast period must be 1-50, got {fast}",
                user_message="Fast period must be between 1 and 50.",
            ))
        if not isinstance(slow, (int, float)) or not 1 <= slow <= 200:
            issues.append(Issue(
                code="INVALID_PARAM",
                message=f"MACD slow period must be 1-200, got {slow}",
                user_message="Slow period must be between 1 and 200.",
            ))
        if not isinstance(signal, (int, float)) or not 1 <= signal <= 50:
            issues.append(Issue(
                code="INVALID_PARAM",
                message=f"MACD signal period must be 1-50, got {signal}",
                user_message="Signal period must be between 1 and 50.",
            ))

        if (
            isinstance(fast, (int, float)) and 1 <= fast <= 50
            and isinstance(slow, (int, float)) and 1 <= slow <= 200
            and fast >= slow
        ):
            issues.append(Issue(
                code="FAST_NOT_LESS_THAN_SLOW",
                message=f"MACD fast period ({fast}) must be less than slow period ({slow})",
                user_message=f"Fast period must be shorter than slow period. Got {fast} ≥ {slow}.",
            ))

        return issues
