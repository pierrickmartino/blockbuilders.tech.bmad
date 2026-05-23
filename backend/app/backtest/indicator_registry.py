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


def _ema_adapter(ctx: IndicatorContext) -> dict[str, list]:
    period = int(ctx.params.get("period", 20))
    result = indicators.ema(ctx.source_series(), period)
    return {"output": result}


def _rsi_adapter(ctx: IndicatorContext) -> dict[str, list]:
    period = int(ctx.params.get("period", 14))
    result = indicators.rsi(ctx.source_series(), period)
    return {"output": result}


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


def _atr_adapter(ctx: IndicatorContext) -> dict[str, list]:
    period = int(ctx.params.get("period", 14))
    highs = ctx.candle_data["high"]
    lows = ctx.candle_data["low"]
    closes = ctx.candle_data["close"]
    result = indicators.atr(highs, lows, closes, period)
    return {"output": result}


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


def _ichimoku_adapter(ctx: IndicatorContext) -> dict[str, list]:
    conversion = int(ctx.params.get("conversion", 9))
    base = int(ctx.params.get("base", 26))
    span_b = int(ctx.params.get("span_b", 52))
    displacement = int(ctx.params.get("displacement", 26))
    highs = ctx.candle_data["high"]
    lows = ctx.candle_data["low"]
    closes = ctx.candle_data["close"]
    conv_line, base_line, span_a, span_b_line = indicators.ichimoku(
        highs, lows, closes, conversion, base, span_b, displacement
    )
    return {
        "output": conv_line,
        "conversion": conv_line,
        "base": base_line,
        "span_a": span_a,
        "span_b": span_b_line,
    }


def _obv_adapter(ctx: IndicatorContext) -> dict[str, list]:
    closes = ctx.candle_data["close"]
    volumes = ctx.candle_data["volume"]
    result = indicators.obv(closes, volumes)
    return {"output": result}


def _fibonacci_adapter(ctx: IndicatorContext) -> dict[str, list]:
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


def _price_variation_pct_adapter(ctx: IndicatorContext) -> dict[str, list]:
    closes = ctx.candle_data["close"]
    result = indicators.price_variation_pct(closes)
    return {"output": result}


INDICATOR_REGISTRY: dict[str, Callable[[IndicatorContext], dict[str, list]]] = {
    "ema": _ema_adapter,
    "rsi": _rsi_adapter,
    "macd": _macd_adapter,
    "bollinger": _bollinger_adapter,
    "atr": _atr_adapter,
    "stochastic": _stochastic_adapter,
    "adx": _adx_adapter,
    "ichimoku": _ichimoku_adapter,
    "obv": _obv_adapter,
    "fibonacci": _fibonacci_adapter,
    "price_variation_pct": _price_variation_pct_adapter,
}
