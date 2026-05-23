"""Compare block handler for the block catalogue."""
from __future__ import annotations

from typing import Any, Mapping

from app.backtest.catalogue.types import BlockContext, BlockSpec, Issue, ParamSpec, PortSpec

_OPERATOR_MAP: dict[str, str] = {
    ">": ">",
    "above": ">",
    "gt": ">",
    "greater_than": ">",
    "<": "<",
    "below": "<",
    "lt": "<",
    "less_than": "<",
    ">=": ">=",
    "gte": ">=",
    "at_or_above": ">=",
    "greater_than_or_equal": ">=",
    "<=": "<=",
    "lte": "<=",
    "at_or_below": "<=",
    "less_than_or_equal": "<=",
}

_SPEC = BlockSpec(
    type="compare",
    category="logic",
    label="Compare",
    inputs=(
        PortSpec(name="left", label="Left"),
        PortSpec(name="right", label="Right"),
    ),
    outputs=(PortSpec(name="output", label="Output"),),
    params=(
        ParamSpec(
            name="operator",
            label="Operator",
            kind="enum",
            default=">",
            options=tuple(_OPERATOR_MAP.keys()),
        ),
    ),
)


def _normalize_operator(operator: Any) -> str | None:
    if not isinstance(operator, str):
        return None
    return _OPERATOR_MAP.get(operator.strip().lower())


def _to_bool_result(l_val: Any, r_val: Any, op: str) -> bool:
    if l_val is None or r_val is None:
        return False
    if op == ">":
        return l_val > r_val
    if op == "<":
        return l_val < r_val
    if op == ">=":
        return l_val >= r_val
    if op == "<=":
        return l_val <= r_val
    return False


class CompareHandler:
    spec: BlockSpec = _SPEC

    def compute(self, ctx: BlockContext) -> dict[str, list]:
        # Tolerate legacy a/b port names for backward compatibility
        left = ctx.input("left") or ctx.input("a", [0.0] * ctx.n)
        right = ctx.input("right") or ctx.input("b", [0.0] * ctx.n)
        raw_op = ctx.params.get("operator", ">")
        op = _normalize_operator(raw_op)

        result = [
            _to_bool_result(
                left[i] if i < len(left) else None,
                right[i] if i < len(right) else None,
                op or "",
            )
            for i in range(ctx.n)
        ]
        return {"output": result}

    def validate(self, params: Mapping[str, Any]) -> list[Issue]:
        operator = params.get("operator", ">")
        if operator and _normalize_operator(operator) is None:
            return [
                Issue(
                    code="INVALID_OPERATOR",
                    message=f"Unknown operator: {operator!r}",
                    user_message=f"Compare operator '{operator}' is not supported.",
                    help_link="/docs/blocks/compare",
                )
            ]
        return []
