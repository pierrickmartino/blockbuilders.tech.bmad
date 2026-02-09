"""Tests for trade explanation builder."""
from datetime import datetime
import pytest
from app.backtest.explanation import (
    build_trade_explanation,
    _build_exit_explanation,
    _extract_conditions,
    _generate_condition_label,
    _get_input_label,
    _build_input_map,
    _compute_indicator_series,
)
from app.models.candle import Candle


def test_build_input_map():
    """Test connection map building."""
    connections = [
        {
            "from_port": {"block_id": "rsi-1", "port": "output"},
            "to_port": {"block_id": "cmp-1", "port": "left"}
        },
        {
            "from_port": {"block_id": "const-1", "port": "output"},
            "to_port": {"block_id": "cmp-1", "port": "right"}
        }
    ]

    input_map = _build_input_map(connections)

    assert "cmp-1" in input_map
    assert input_map["cmp-1"]["left"] == ("rsi-1", "output")
    assert input_map["cmp-1"]["right"] == ("const-1", "output")


def test_build_input_map_legacy_format():
    """Test connection map building with legacy format."""
    connections = [
        {
            "from": {"block_id": "rsi-1", "port": "output"},
            "to": {"block_id": "cmp-1", "port": "a"}
        }
    ]

    input_map = _build_input_map(connections)

    assert "cmp-1" in input_map
    assert input_map["cmp-1"]["a"] == ("rsi-1", "output")


def test_get_input_label_indicators():
    """Test input label generation for indicator blocks."""
    block_map = {
        "sma-1": {"id": "sma-1", "type": "sma", "params": {"period": 20}},
        "ema-1": {"id": "ema-1", "type": "ema", "params": {"period": 12}},
        "rsi-1": {"id": "rsi-1", "type": "rsi", "params": {"period": 14}},
    }
    input_map = {}

    assert _get_input_label(("sma-1", "output"), block_map, input_map) == "SMA(20)"
    assert _get_input_label(("ema-1", "output"), block_map, input_map) == "EMA(12)"
    assert _get_input_label(("rsi-1", "output"), block_map, input_map) == "RSI(14)"


def test_get_input_label_price_source():
    """Test input label generation for price blocks."""
    block_map = {
        "price-1": {"id": "price-1", "type": "price", "params": {"source": "close"}},
        "const-1": {"id": "const-1", "type": "constant", "params": {"value": 30}},
    }
    input_map = {}

    assert _get_input_label(("price-1", "output"), block_map, input_map) == "Close"
    assert _get_input_label(("const-1", "output"), block_map, input_map) == "30"


def test_generate_condition_label_compare():
    """Test condition label generation for compare blocks."""
    block_map = {
        "rsi-1": {"id": "rsi-1", "type": "rsi", "params": {"period": 14}},
        "const-1": {"id": "const-1", "type": "constant", "params": {"value": 30}},
        "cmp-1": {
            "id": "cmp-1",
            "type": "compare",
            "params": {"operator": "<"}
        }
    }
    input_map = {
        "cmp-1": {
            "left": ("rsi-1", "output"),
            "right": ("const-1", "output")
        }
    }

    label = _generate_condition_label(block_map["cmp-1"], block_map, input_map)
    assert label == "RSI(14) < 30"


def test_generate_condition_label_compare_operators():
    """Test all compare operators."""
    block_map = {
        "a": {"id": "a", "type": "constant", "params": {"value": 10}},
        "b": {"id": "b", "type": "constant", "params": {"value": 20}},
        "cmp": {"id": "cmp", "type": "compare", "params": {"operator": ">"}}
    }
    input_map = {
        "cmp": {"left": ("a", "output"), "right": ("b", "output")}
    }

    operators = {
        ">": ">",
        "<": "<",
        ">=": "≥",
        "<=": "≤",
        "==": "=",
        "!=": "≠"
    }

    for op, symbol in operators.items():
        block_map["cmp"]["params"]["operator"] = op
        label = _generate_condition_label(block_map["cmp"], block_map, input_map)
        assert label == f"10 {symbol} 20"


def test_generate_condition_label_crossover():
    """Test condition label generation for crossover blocks."""
    block_map = {
        "ema-12": {"id": "ema-12", "type": "ema", "params": {"period": 12}},
        "ema-24": {"id": "ema-24", "type": "ema", "params": {"period": 24}},
        "cross-1": {
            "id": "cross-1",
            "type": "crossover",
            "params": {"direction": "crosses_above"}
        }
    }
    input_map = {
        "cross-1": {
            "fast": ("ema-12", "output"),
            "slow": ("ema-24", "output")
        }
    }

    label = _generate_condition_label(block_map["cross-1"], block_map, input_map)
    assert label == "EMA(12) crossed above EMA(24)"


def test_extract_conditions_simple():
    """Test condition extraction for simple strategy."""
    block_map = {
        "rsi-1": {"id": "rsi-1", "type": "rsi", "params": {"period": 14}},
        "const-1": {"id": "const-1", "type": "constant", "params": {"value": 30}},
        "cmp-1": {"id": "cmp-1", "type": "compare", "params": {"operator": "<"}},
        "entry-1": {"id": "entry-1", "type": "entry_signal", "params": {}}
    }
    input_map = {
        "cmp-1": {
            "left": ("rsi-1", "output"),
            "right": ("const-1", "output")
        },
        "entry-1": {
            "signal": ("cmp-1", "output")
        }
    }

    conditions = _extract_conditions("entry-1", block_map, input_map)
    assert len(conditions) == 1
    assert conditions[0] == "RSI(14) < 30"


def test_extract_conditions_and():
    """Test condition extraction with AND logic."""
    block_map = {
        "rsi-1": {"id": "rsi-1", "type": "rsi", "params": {"period": 14}},
        "const-30": {"id": "const-30", "type": "constant", "params": {"value": 30}},
        "cmp-1": {"id": "cmp-1", "type": "compare", "params": {"operator": "<"}},
        "ema-12": {"id": "ema-12", "type": "ema", "params": {"period": 12}},
        "ema-24": {"id": "ema-24", "type": "ema", "params": {"period": 24}},
        "cross-1": {"id": "cross-1", "type": "crossover", "params": {"direction": "crosses_above"}},
        "and-1": {"id": "and-1", "type": "and", "params": {}},
        "entry-1": {"id": "entry-1", "type": "entry_signal", "params": {}}
    }
    input_map = {
        "cmp-1": {
            "left": ("rsi-1", "output"),
            "right": ("const-30", "output")
        },
        "cross-1": {
            "fast": ("ema-12", "output"),
            "slow": ("ema-24", "output")
        },
        "and-1": {
            "a": ("cmp-1", "output"),
            "b": ("cross-1", "output")
        },
        "entry-1": {
            "signal": ("and-1", "output")
        }
    }

    conditions = _extract_conditions("entry-1", block_map, input_map)
    assert len(conditions) == 2
    assert "RSI(14) < 30" in conditions
    assert "EMA(12) crossed above EMA(24)" in conditions


def test_build_exit_explanation_all_reasons():
    """Test exit explanation for all exit reason types."""
    test_cases = [
        ("tp", 43500.0, None, "Take profit hit at 43500.00"),
        ("sl", None, 42000.0, "Stop loss hit at 42000.00"),
        ("signal", None, None, "Exit signal triggered"),
        ("end_of_data", None, None, "Backtest period ended"),
        ("trailing_stop", None, None, "Trailing stop triggered"),
        ("time_exit", None, None, "Time exit: maximum hold duration reached"),
        ("max_drawdown", None, None, "Max drawdown threshold hit"),
    ]

    for exit_reason, tp_price, sl_price, expected_summary in test_cases:
        exp = _build_exit_explanation(exit_reason, sl_price, tp_price)
        assert exp.summary == expected_summary
        assert exp.reason_type == exit_reason


def test_compute_indicator_series():
    """Test indicator series computation."""
    definition = {
        "blocks": [
            {"id": "sma-1", "type": "sma", "params": {"period": 5, "source": "close"}},
            {"id": "ema-1", "type": "ema", "params": {"period": 3, "source": "close"}},
        ],
        "connections": []
    }

    # Create test candles
    candles = [
        Candle(
            asset="BTC/USDT",
            timeframe="1d",
            timestamp=datetime(2025, 1, i),
            open=100.0 + i,
            high=105.0 + i,
            low=95.0 + i,
            close=100.0 + i,
            volume=1000.0
        )
        for i in range(1, 11)
    ]

    indicator_series = _compute_indicator_series(definition, candles)

    assert len(indicator_series) == 2
    assert indicator_series[0].indicator_type == "sma"
    assert indicator_series[0].label == "SMA(5)"
    assert not indicator_series[0].subplot
    assert indicator_series[1].indicator_type == "ema"
    assert indicator_series[1].label == "EMA(3)"


def test_build_trade_explanation_full():
    """Test full trade explanation building."""
    definition = {
        "blocks": [
            {"id": "rsi-1", "type": "rsi", "params": {"period": 14}},
            {"id": "const-30", "type": "constant", "params": {"value": 30}},
            {"id": "cmp-1", "type": "compare", "params": {"operator": "<"}},
            {"id": "entry-1", "type": "entry_signal", "params": {}},
            {"id": "sma-20", "type": "sma", "params": {"period": 5}},
        ],
        "connections": [
            {
                "from_port": {"block_id": "rsi-1", "port": "output"},
                "to_port": {"block_id": "cmp-1", "port": "left"}
            },
            {
                "from_port": {"block_id": "const-30", "port": "output"},
                "to_port": {"block_id": "cmp-1", "port": "right"}
            },
            {
                "from_port": {"block_id": "cmp-1", "port": "output"},
                "to_port": {"block_id": "entry-1", "port": "signal"}
            }
        ]
    }

    # Create test candles
    candles = [
        Candle(
            asset="BTC/USDT",
            timeframe="1d",
            timestamp=datetime(2025, 1, i),
            open=100.0 + i,
            high=105.0 + i,
            low=95.0 + i,
            close=100.0 + i,
            volume=1000.0
        )
        for i in range(1, 21)
    ]

    entry_exp, exit_exp, indicators = build_trade_explanation(
        definition=definition,
        candles=candles,
        trade_entry_idx=10,
        trade_exit_idx=15,
        exit_reason="tp",
        sl_price=95.0,
        tp_price=115.0,
    )

    # Check entry explanation
    assert "RSI(14) < 30" in entry_exp.summary
    assert len(entry_exp.conditions) == 1
    assert "RSI(14) < 30 ✓" in entry_exp.conditions

    # Check exit explanation
    assert exit_exp.reason_type == "tp"
    assert "Take profit" in exit_exp.summary
    assert exit_exp.details is not None
    assert exit_exp.details["tp_price"] == 115.0

    # Check indicators
    assert len(indicators) == 1
    assert indicators[0].label == "SMA(5)"


def test_build_trade_explanation_empty_strategy():
    """Test explanation with empty strategy."""
    definition = {"blocks": [], "connections": []}
    candles = [
        Candle(
            asset="BTC/USDT",
            timeframe="1d",
            timestamp=datetime(2025, 1, 1),
            open=100.0,
            high=105.0,
            low=95.0,
            close=100.0,
            volume=1000.0
        )
    ]

    entry_exp, exit_exp, indicators = build_trade_explanation(
        definition=definition,
        candles=candles,
        trade_entry_idx=0,
        trade_exit_idx=0,
        exit_reason="signal",
        sl_price=None,
        tp_price=None,
    )

    assert "strategy logic" in entry_exp.summary.lower()
    assert len(entry_exp.conditions) == 0
    assert exit_exp.reason_type == "signal"
    assert len(indicators) == 0
