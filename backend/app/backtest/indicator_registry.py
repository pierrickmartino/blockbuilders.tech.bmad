from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from . import indicators
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


def _macd_adapter(ctx: IndicatorContext) -> dict[str, list]:
    fast = int(ctx.params.get("fast_period", 12))
    slow = int(ctx.params.get("slow_period", 26))
    signal = int(ctx.params.get("signal_period", 9))
    macd_line, signal_line, histogram = indicators.macd(ctx.source_series(), fast, slow, signal)
    return {
        "output": macd_line,
        "macd": macd_line,
        "signal": signal_line,
        "histogram": histogram,
    }


def _bollinger_adapter(ctx: IndicatorContext) -> dict[str, list]:
    period = int(ctx.params.get("period", 20))
    std_dev = float(ctx.params.get("stddev", 2.0))
    upper, middle, lower = indicators.bollinger(ctx.source_series(), period, std_dev)
    return {
        "output": middle,
        "upper": upper,
        "middle": middle,
        "lower": lower,
    }


def _stochastic_adapter(ctx: IndicatorContext) -> dict[str, list]:
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


def _adx_adapter(ctx: IndicatorContext) -> dict[str, list]:
    period = int(ctx.params.get("period", 14))
    highs = ctx.candle_data["high"]
    lows = ctx.candle_data["low"]
    closes = ctx.candle_data["close"]
    adx_line, plus_di, minus_di = indicators.adx(highs, lows, closes, period)
    return {
        "output": adx_line,
        "adx": adx_line,
        "plus_di": plus_di,
        "minus_di": minus_di,
    }


INDICATOR_REGISTRY: dict[str, Callable[[IndicatorContext], dict[str, list]]] = {
    "macd": _macd_adapter,
    "bollinger": _bollinger_adapter,
    "stochastic": _stochastic_adapter,
    "adx": _adx_adapter,
}
