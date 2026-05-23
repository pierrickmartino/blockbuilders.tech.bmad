"""Protocol types for the block catalogue.

Every block handler in the catalogue must satisfy the BlockHandler protocol.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, Mapping, Protocol, runtime_checkable

from app.backtest.errors import StrategyInvalidError


@dataclass(frozen=True)
class ParamSpec:
    name: str
    label: str
    kind: Literal["int", "float", "str", "enum"]
    default: Any
    min: Any = None
    max: Any = None
    options: tuple[str, ...] = ()


@dataclass(frozen=True)
class PortSpec:
    name: str
    label: str


@dataclass(frozen=True)
class BlockSpec:
    type: str
    category: Literal["input", "indicator", "logic", "signal", "risk"]
    label: str
    inputs: tuple[PortSpec, ...]
    outputs: tuple[PortSpec, ...]
    params: tuple[ParamSpec, ...]


@dataclass(frozen=True)
class Issue:
    code: str
    message: str
    user_message: str = ""
    help_link: str = ""


@dataclass(frozen=True)
class BlockContext:
    candle_data: dict[str, list]
    params: dict
    inputs: dict[str, list]
    n: int

    def source_series(self, default: str = "close") -> list:
        source = self.params.get("source", default)
        if source not in self.candle_data:
            raise StrategyInvalidError(
                f"Unknown price source: {source!r}",
                f"Invalid strategy: unknown price source '{source}'. Use one of: open, high, low, close, prev_close, volume.",
            )
        return self.candle_data[source]

    def input(self, port: str, default: list | None = None) -> list:
        return self.inputs.get(port, default or [])


@runtime_checkable
class BlockHandler(Protocol):
    spec: BlockSpec

    def compute(self, ctx: BlockContext) -> dict[str, list]: ...

    def validate(self, params: Mapping[str, Any]) -> list[Issue]: ...
