import pytest

from app.backtest.errors import StrategyInvalidError
from app.backtest.indicator_registry import INDICATOR_REGISTRY, IndicatorContext

KNOWN_INDICATOR_TYPES = {
    "sma",
    "ema",
    "rsi",
    "macd",
    "bollinger",
    "atr",
    "stochastic",
    "adx",
    "ichimoku",
    "obv",
    "fibonacci",
    "price_variation_pct",
}

NON_INDICATOR_TYPES = {
    "price",
    "volume",
    "constant",
    "yesterday_close",
    "compare",
    "crossover",
    "and",
    "or",
    "not",
    "entry_signal",
    "exit_signal",
    "position_size",
    "take_profit",
    "stop_loss",
    "max_drawdown",
    "time_exit",
    "trailing_stop",
}


def test_registry_completeness():
    assert set(INDICATOR_REGISTRY.keys()) == KNOWN_INDICATOR_TYPES


def test_registry_disjointness():
    assert INDICATOR_REGISTRY.keys().isdisjoint(NON_INDICATOR_TYPES)


@pytest.mark.parametrize("indicator_type", sorted(KNOWN_INDICATOR_TYPES))
def test_adapter_port_shape(indicator_type: str) -> None:
    n = 50
    closes = [float(100 + i) for i in range(n)]
    candle_data = {
        "open": closes[:],
        "high": [c + 1.0 for c in closes],
        "low": [c - 1.0 for c in closes],
        "close": closes[:],
        "volume": [1000.0] * n,
    }
    ctx = IndicatorContext(candle_data=candle_data, params={}, n=n)
    result = INDICATOR_REGISTRY[indicator_type](ctx)

    assert isinstance(result, dict), f"{indicator_type}: result is not a dict"
    assert len(result) > 0, f"{indicator_type}: result dict is empty"
    assert "output" in result, f"{indicator_type}: 'output' key missing"
    for key, value in result.items():
        assert isinstance(value, list), f"{indicator_type}.{key} is not a list"
        assert len(value) == n, f"{indicator_type}.{key} has length {len(value)}, expected {n}"


# ---------------------------------------------------------------------------
# source_series() strict validation (issue #406)
# ---------------------------------------------------------------------------

def _make_candle_data(n: int = 10) -> dict[str, list]:
    closes = [float(100 + i) for i in range(n)]
    return {
        "open": closes[:],
        "high": [c + 1.0 for c in closes],
        "low": [c - 1.0 for c in closes],
        "close": closes[:],
        "volume": [1000.0] * n,
        "prev_close": [c - 0.5 for c in closes],
    }


def test_source_series_defaults_to_close() -> None:
    candle_data = _make_candle_data()
    ctx = IndicatorContext(candle_data=candle_data, params={}, n=10)
    assert ctx.source_series() == candle_data["close"]


@pytest.mark.parametrize("source", ["open", "high", "low", "close", "volume", "prev_close"])
def test_source_series_valid_sources(source: str) -> None:
    candle_data = _make_candle_data()
    ctx = IndicatorContext(candle_data=candle_data, params={"source": source}, n=10)
    assert ctx.source_series() == candle_data[source]


def test_source_series_raises_on_unknown_source() -> None:
    candle_data = _make_candle_data()
    ctx = IndicatorContext(candle_data=candle_data, params={"source": "typo"}, n=10)
    with pytest.raises(StrategyInvalidError) as exc_info:
        ctx.source_series()
    assert "typo" in str(exc_info.value)


def test_source_series_error_message_lists_valid_sources() -> None:
    candle_data = _make_candle_data()
    ctx = IndicatorContext(candle_data=candle_data, params={"source": "bad_source"}, n=10)
    with pytest.raises(StrategyInvalidError) as exc_info:
        ctx.source_series()
    assert exc_info.value.user_message is not None
    assert "close" in exc_info.value.user_message
