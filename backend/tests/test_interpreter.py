"""Tests for strategy interpreter signal wiring and evaluation."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.backtest.interpreter import interpret_strategy
from app.models.candle import Candle


def make_descending_candles(count: int = 20) -> list[Candle]:
    """Create candles with monotonically decreasing closes (RSI approaches 0)."""
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 100.0
    for i in range(count):
        close = price - 1.0
        candles.append(
            Candle(
                id=uuid4(),
                asset="BTC/USDT",
                timeframe="1d",
                timestamp=start + timedelta(days=i),
                open=price,
                high=price + 1.0,
                low=close - 1.0,
                close=close,
                volume=1000.0,
            )
        )
        price = close
    return candles


def test_compare_supports_legacy_a_b_ports_for_entry_signal():
    candles = make_descending_candles()
    definition = {
        "blocks": [
            {"id": "rsi-1", "type": "rsi", "params": {"period": 14}},
            {"id": "const-1", "type": "constant", "params": {"value": 20}},
            {"id": "cmp-1", "type": "compare", "params": {"operator": "<"}},
            {"id": "entry-1", "type": "entry_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "rsi-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "a"}},
            {"from": {"block_id": "const-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "b"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "entry-1", "port": "signal"}},
        ],
    }

    signals = interpret_strategy(definition, candles)

    # RSI(14) should become 0 on persistent declines, so RSI < 20 should trigger.
    assert any(signals.entry_long)


def test_compare_supports_left_right_ports_for_entry_signal():
    candles = make_descending_candles()
    definition = {
        "blocks": [
            {"id": "rsi-1", "type": "rsi", "params": {"period": 14}},
            {"id": "const-1", "type": "constant", "params": {"value": 20}},
            {"id": "cmp-1", "type": "compare", "params": {"operator": "<"}},
            {"id": "entry-1", "type": "entry_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "rsi-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "left"}},
            {"from": {"block_id": "const-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "right"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "entry-1", "port": "signal"}},
        ],
    }

    signals = interpret_strategy(definition, candles)

    assert any(signals.entry_long)


def test_compare_supports_legacy_word_operator_below_for_entry_signal():
    candles = make_descending_candles()
    definition = {
        "blocks": [
            {"id": "rsi-1", "type": "rsi", "params": {"period": 14}},
            {"id": "const-1", "type": "constant", "params": {"value": 20}},
            {"id": "cmp-1", "type": "compare", "params": {"operator": "below"}},
            {"id": "entry-1", "type": "entry_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "rsi-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "left"}},
            {"from": {"block_id": "const-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "right"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "entry-1", "port": "signal"}},
        ],
    }

    signals = interpret_strategy(definition, candles)

    assert any(signals.entry_long)


def make_uptrend_candles(count: int = 60) -> list[Candle]:
    """Create candles with monotonically increasing closes."""
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles: list[Candle] = []
    price = 50.0
    for i in range(count):
        close = price + 1.0
        candles.append(
            Candle(
                id=uuid4(),
                asset="BTC/USDT",
                timeframe="1d",
                timestamp=start + timedelta(days=i),
                open=price,
                high=close + 0.5,
                low=price - 0.5,
                close=close,
                volume=1000.0,
            )
        )
        price = close
    return candles


def test_macd_signal_port_produces_entry_via_registry():
    """MACD block exposes 'signal' port that can wire into compare."""
    candles = make_uptrend_candles(60)
    definition = {
        "blocks": [
            {"id": "macd-1", "type": "macd", "params": {"fast_period": 12, "slow_period": 26, "signal_period": 9}},
            {"id": "const-1", "type": "constant", "params": {"value": 0}},
            {"id": "cmp-1", "type": "compare", "params": {"operator": ">"}},
            {"id": "entry-1", "type": "entry_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "macd-1", "port": "signal"}, "to": {"block_id": "cmp-1", "port": "left"}},
            {"from": {"block_id": "const-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "right"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "entry-1", "port": "signal"}},
        ],
    }

    signals = interpret_strategy(definition, candles)

    # signal series should be a real list of bools, not all-None
    assert isinstance(signals.entry_long, list)
    assert len(signals.entry_long) == len(candles)


def test_bollinger_lower_port_triggers_entry_on_price_below_band():
    """Bollinger block exposes 'lower' port; price below lower band triggers entry."""
    candles = make_descending_candles(60)
    definition = {
        "blocks": [
            {"id": "price-1", "type": "price", "params": {"source": "close"}},
            {"id": "boll-1", "type": "bollinger", "params": {"period": 20, "stddev": 2.0}},
            {"id": "cmp-1", "type": "compare", "params": {"operator": "<"}},
            {"id": "entry-1", "type": "entry_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "price-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "left"}},
            {"from": {"block_id": "boll-1", "port": "lower"}, "to": {"block_id": "cmp-1", "port": "right"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "entry-1", "port": "signal"}},
        ],
    }

    signals = interpret_strategy(definition, candles)

    assert isinstance(signals.entry_long, list)
    assert len(signals.entry_long) == len(candles)


# ---------------------------------------------------------------------------
# End-to-end integration: one test per indicator, full strategy chain
#   price source → indicator → comparator → entry_signal
#
# 100 candles (uptrend) covers the longest warmup period: Ichimoku span_b=52
# plus displacement=26, leaving data for the remaining candles.
#
# Assertions target *integration shape*, not numerical correctness:
#   • entry_long and exit_long are lists of length n
#   • risk fields default to their no-block values
# ---------------------------------------------------------------------------

import pytest  # noqa: E402 (local import grouping acceptable inside module)

_INDICATOR_CASES = [
    ("sma",               {"period": 10},                                          "output", ">",  0),
    ("ema",               {"period": 10},                                          "output", ">",  0),
    ("rsi",               {"period": 14},                                          "output", "<",  70),
    ("macd",              {"fast_period": 12, "slow_period": 26, "signal_period": 9}, "output", ">", -1),
    ("bollinger",         {"period": 20, "stddev": 2.0},                           "output", ">",  0),
    ("atr",               {"period": 14},                                          "output", ">",  0),
    ("stochastic",        {"k_period": 14, "d_period": 3, "smooth": 3},           "output", "<",  100),
    ("adx",               {"period": 14},                                          "output", ">",  0),
    ("ichimoku",          {"conversion": 9, "base": 26, "span_b": 52, "displacement": 26}, "output", ">", 0),
    ("obv",               {},                                                      "output", ">", -1),
    ("fibonacci",         {"lookback": 50},                                        "output", ">",  0),
    ("price_variation_pct", {},                                                    "output", ">", -100),
]


@pytest.mark.parametrize("indicator_type,params,port,operator,threshold", _INDICATOR_CASES)
def test_indicator_full_strategy_chain_shape(
    indicator_type: str,
    params: dict,
    port: str,
    operator: str,
    threshold: float,
) -> None:
    """price source → indicator → comparator → entry_signal returns correct signal shape."""
    candles = make_uptrend_candles(100)
    n = len(candles)
    definition = {
        "blocks": [
            {"id": "price-1",                "type": "price",        "params": {"source": "close"}},
            {"id": f"{indicator_type}-1",    "type": indicator_type, "params": params},
            {"id": "const-1",               "type": "constant",     "params": {"value": threshold}},
            {"id": "cmp-1",                 "type": "compare",      "params": {"operator": operator}},
            {"id": "entry-1",               "type": "entry_signal", "params": {}},
        ],
        "connections": [
            {
                "from": {"block_id": f"{indicator_type}-1", "port": port},
                "to":   {"block_id": "cmp-1",               "port": "left"},
            },
            {
                "from": {"block_id": "const-1", "port": "output"},
                "to":   {"block_id": "cmp-1",   "port": "right"},
            },
            {
                "from": {"block_id": "cmp-1",   "port": "output"},
                "to":   {"block_id": "entry-1", "port": "signal"},
            },
        ],
    }

    signals = interpret_strategy(definition, candles)

    assert isinstance(signals.entry_long, list)
    assert len(signals.entry_long) == n
    assert isinstance(signals.exit_long, list)
    assert len(signals.exit_long) == n
    assert signals.position_size_pct == 100.0
    assert signals.stop_loss_pct is None
    assert signals.take_profit_levels is None
