import pytest

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
