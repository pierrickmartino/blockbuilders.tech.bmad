"""Constant source block handler."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest.catalogue.types import BlockContext, BlockHandler, BlockSpec, Issue, ParamSpec, PortSpec

_SPEC = BlockSpec(
    type="constant",
    category="input",
    label="Constant",
    inputs=(),
    outputs=(PortSpec(name="output", label="Output", explain="{value}"),),
    params=(
        ParamSpec(
            name="value",
            label="Value",
            kind="float",
            default=0.0,
            min=-1_000_000,
            max=1_000_000,
        ),
    ),
)


class ConstantHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        value = float(ctx.params.get("value", 0.0))
        return {"output": [value] * ctx.n}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        value = params.get("value", 0)
        if not isinstance(value, (int, float)):
            return [Issue(
                code="INVALID_VALUE",
                message=f"Constant value must be a number, got {type(value).__name__}",
                user_message="Constant value must be a number.",
                help_link="/docs/blocks/constant",
            )]
        if not -1_000_000 <= value <= 1_000_000:
            return [Issue(
                code="INVALID_VALUE",
                message=f"Constant value must be between -1,000,000 and 1,000,000, got {value}",
                user_message="Constant value must be between -1,000,000 and 1,000,000.",
                help_link="/docs/blocks/constant",
            )]
        return []
