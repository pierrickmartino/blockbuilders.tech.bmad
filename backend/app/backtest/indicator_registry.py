from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from .errors import StrategyInvalidError


@dataclass(frozen=True)
class IndicatorContext:
    candle_data: dict[str, list]
    params: dict
    n: int

    def source_series(self, default: str = "close") -> list:
        source = self.params.get("source", default)
        if source not in self.candle_data:
            raise StrategyInvalidError(
                f"Unknown price source: {source!r}",
                f"Invalid strategy: unknown price source '{source}'. Use one of: open, high, low, close, prev_close, volume.",
            )
        return self.candle_data[source]


INDICATOR_REGISTRY: dict[str, Callable[[IndicatorContext], dict[str, list]]] = {}
