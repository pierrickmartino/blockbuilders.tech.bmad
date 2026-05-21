"""Tests for strategy_validation service — pure unit, zero I/O."""
import inspect

import pytest

from app.schemas.strategy import Block, BlockPosition, Connection, ConnectionPort, StrategyDefinitionValidate


# ── helpers ───────────────────────────────────────────────────────────────────

def make_block(block_type: str, params: dict, block_id: str = "b1") -> Block:
    return Block(id=block_id, type=block_type, label=block_type, position=BlockPosition(x=0, y=0), params=params)


def make_connection(from_id: str, to_id: str) -> Connection:
    return Connection(
        from_port=ConnectionPort(block_id=from_id, port="out"),
        to_port=ConnectionPort(block_id=to_id, port="in"),
    )


def make_definition(blocks: list[Block], connections: list[Connection] | None = None) -> StrategyDefinitionValidate:
    return StrategyDefinitionValidate(blocks=blocks, connections=connections or [])


# ── module purity check ───────────────────────────────────────────────────────

def test_strategy_validation_has_no_forbidden_imports():
    import app.services.strategy_validation as mod

    src = inspect.getsource(mod)
    assert "from fastapi" not in src
    assert "from sqlmodel" not in src
    assert "from app.db" not in src


# ── validate_block_params: indicator period validations ──────────────────────

@pytest.mark.parametrize("block_type,params", [
    ("sma", {"period": 20}),
    ("ema", {"period": 10}),
    ("bollinger", {"period": 20}),
    ("atr", {"period": 14}),
])
def test_indicator_valid_period_returns_no_errors(block_type, params):
    from app.services.strategy_validation import validate_block_params

    assert validate_block_params(make_block(block_type, params)) == []


@pytest.mark.parametrize("block_type,params", [
    ("sma", {"period": 0}),
    ("ema", {"period": 501}),
    ("bollinger", {"period": -1}),
    ("atr", {"period": "bad"}),
])
def test_indicator_invalid_period_returns_error(block_type, params):
    from app.services.strategy_validation import validate_block_params

    errors = validate_block_params(make_block(block_type, params))
    assert len(errors) == 1
    assert errors[0].code == "INVALID_PERIOD"
    assert errors[0].block_id == "b1"


def test_rsi_valid_period():
    from app.services.strategy_validation import validate_block_params

    assert validate_block_params(make_block("rsi", {"period": 14})) == []


@pytest.mark.parametrize("period", [1, 101])
def test_rsi_out_of_range_period(period):
    from app.services.strategy_validation import validate_block_params

    errors = validate_block_params(make_block("rsi", {"period": period}))
    assert len(errors) == 1
    assert errors[0].code == "INVALID_PERIOD"


def test_macd_valid():
    from app.services.strategy_validation import validate_block_params

    block = make_block("macd", {"fast_period": 12, "slow_period": 26, "signal_period": 9})
    assert validate_block_params(block) == []


def test_macd_fast_period_too_high():
    from app.services.strategy_validation import validate_block_params

    block = make_block("macd", {"fast_period": 51, "slow_period": 26, "signal_period": 9})
    errors = validate_block_params(block)
    assert any(e.code == "INVALID_PARAM" for e in errors)


def test_macd_slow_period_too_high():
    from app.services.strategy_validation import validate_block_params

    block = make_block("macd", {"fast_period": 12, "slow_period": 201, "signal_period": 9})
    errors = validate_block_params(block)
    assert any(e.code == "INVALID_PARAM" for e in errors)


def test_macd_signal_period_too_high():
    from app.services.strategy_validation import validate_block_params

    block = make_block("macd", {"fast_period": 12, "slow_period": 26, "signal_period": 51})
    errors = validate_block_params(block)
    assert any(e.code == "INVALID_PARAM" for e in errors)


# ── validate_block_params: constant ──────────────────────────────────────────

def test_constant_valid_value():
    from app.services.strategy_validation import validate_block_params

    assert validate_block_params(make_block("constant", {"value": 42})) == []


def test_constant_non_numeric_value():
    from app.services.strategy_validation import validate_block_params

    errors = validate_block_params(make_block("constant", {"value": "oops"}))
    assert len(errors) == 1
    assert errors[0].code == "INVALID_VALUE"


def test_constant_out_of_range():
    from app.services.strategy_validation import validate_block_params

    errors = validate_block_params(make_block("constant", {"value": 2_000_000}))
    assert len(errors) == 1
    assert errors[0].code == "INVALID_VALUE"


# ── validate_block_params: risk blocks ───────────────────────────────────────

def test_position_size_valid():
    from app.services.strategy_validation import validate_block_params

    assert validate_block_params(make_block("position_size", {"value": 50})) == []


def test_position_size_over_100():
    from app.services.strategy_validation import validate_block_params

    errors = validate_block_params(make_block("position_size", {"value": 101}))
    assert len(errors) == 1
    assert errors[0].code == "INVALID_PERCENT"


def test_stop_loss_valid():
    from app.services.strategy_validation import validate_block_params

    assert validate_block_params(make_block("stop_loss", {"stop_loss_pct": 5.0})) == []


def test_stop_loss_zero_is_invalid():
    from app.services.strategy_validation import validate_block_params

    errors = validate_block_params(make_block("stop_loss", {"stop_loss_pct": 0}))
    assert len(errors) == 1
    assert errors[0].code == "INVALID_PERCENT"


def test_time_exit_valid():
    from app.services.strategy_validation import validate_block_params

    assert validate_block_params(make_block("time_exit", {"bars": 5})) == []


def test_time_exit_zero_bars_invalid():
    from app.services.strategy_validation import validate_block_params

    errors = validate_block_params(make_block("time_exit", {"bars": 0}))
    assert len(errors) == 1
    assert errors[0].code == "INVALID_BARS"


def test_max_drawdown_valid():
    from app.services.strategy_validation import validate_block_params

    assert validate_block_params(make_block("max_drawdown", {"max_drawdown_pct": 10.0})) == []


def test_max_drawdown_invalid():
    from app.services.strategy_validation import validate_block_params

    errors = validate_block_params(make_block("max_drawdown", {"max_drawdown_pct": 0}))
    assert len(errors) == 1
    assert errors[0].code == "INVALID_PERCENT"


def test_trailing_stop_valid():
    from app.services.strategy_validation import validate_block_params

    assert validate_block_params(make_block("trailing_stop", {"trail_pct": 5.0})) == []


def test_trailing_stop_zero_is_invalid():
    from app.services.strategy_validation import validate_block_params

    errors = validate_block_params(make_block("trailing_stop", {"trail_pct": 0}))
    assert len(errors) == 1
    assert errors[0].code == "INVALID_PERCENT"


def test_take_profit_valid_legacy_pct():
    from app.services.strategy_validation import validate_block_params

    assert validate_block_params(make_block("take_profit", {"take_profit_pct": 5.0})) == []


def test_take_profit_invalid_legacy_pct():
    from app.services.strategy_validation import validate_block_params

    errors = validate_block_params(make_block("take_profit", {"take_profit_pct": 0}))
    assert len(errors) == 1
    assert errors[0].code == "INVALID_PERCENT"


def test_take_profit_valid_levels():
    from app.services.strategy_validation import validate_block_params

    params = {"levels": [{"profit_pct": 5.0, "close_pct": 50}]}
    assert validate_block_params(make_block("take_profit", params)) == []


def test_take_profit_too_many_levels():
    from app.services.strategy_validation import validate_block_params

    params = {"levels": [
        {"profit_pct": 1, "close_pct": 20},
        {"profit_pct": 2, "close_pct": 20},
        {"profit_pct": 3, "close_pct": 20},
        {"profit_pct": 4, "close_pct": 20},
    ]}
    errors = validate_block_params(make_block("take_profit", params))
    assert any(e.code == "INVALID_LEVELS" for e in errors)


def test_take_profit_zero_profit_pct():
    from app.services.strategy_validation import validate_block_params

    params = {"levels": [{"profit_pct": 0, "close_pct": 50}]}
    errors = validate_block_params(make_block("take_profit", params))
    assert any(e.code == "INVALID_PROFIT" for e in errors)


def test_take_profit_profit_not_ascending():
    from app.services.strategy_validation import validate_block_params

    params = {"levels": [
        {"profit_pct": 5.0, "close_pct": 50},
        {"profit_pct": 3.0, "close_pct": 50},
    ]}
    errors = validate_block_params(make_block("take_profit", params))
    assert any(e.code == "INVALID_PROFIT_ORDER" for e in errors)


def test_take_profit_total_close_exceeds_100():
    from app.services.strategy_validation import validate_block_params

    params = {"levels": [
        {"profit_pct": 1.0, "close_pct": 60},
        {"profit_pct": 2.0, "close_pct": 60},
    ]}
    errors = validate_block_params(make_block("take_profit", params))
    assert any(e.code == "INVALID_TOTAL_CLOSE" for e in errors)


def test_take_profit_invalid_level_not_dict():
    from app.services.strategy_validation import validate_block_params

    params = {"levels": ["not_a_dict"]}
    errors = validate_block_params(make_block("take_profit", params))
    assert any(e.code == "INVALID_LEVEL" for e in errors)


def test_take_profit_invalid_close_pct():
    from app.services.strategy_validation import validate_block_params

    params = {"levels": [{"profit_pct": 5.0, "close_pct": 0}]}
    errors = validate_block_params(make_block("take_profit", params))
    assert any(e.code == "INVALID_CLOSE" for e in errors)


def test_unknown_block_type_passes_through():
    from app.services.strategy_validation import validate_block_params

    assert validate_block_params(make_block("entry_signal", {})) == []


# ── collect_validation_errors ─────────────────────────────────────────────────

def test_missing_entry_signal_raises_error():
    from app.services.strategy_validation import collect_validation_errors

    definition = make_definition([make_block("exit_signal", {}, "e1")])
    codes = [e.code for e in collect_validation_errors(definition)]
    assert "MISSING_ENTRY" in codes


def test_missing_exit_condition_raises_error():
    from app.services.strategy_validation import collect_validation_errors

    definition = make_definition([make_block("entry_signal", {}, "en1")])
    codes = [e.code for e in collect_validation_errors(definition)]
    assert "MISSING_EXIT" in codes


def test_valid_minimal_strategy_no_errors():
    from app.services.strategy_validation import collect_validation_errors

    entry = make_block("entry_signal", {}, "entry1")
    exit_b = make_block("exit_signal", {}, "exit1")
    indicator = make_block("sma", {"period": 20}, "sma1")
    definition = make_definition(
        [entry, exit_b, indicator],
        [make_connection("sma1", "entry1"), make_connection("sma1", "exit1")],
    )
    assert collect_validation_errors(definition) == []


def test_duplicate_risk_block_raises_error():
    from app.services.strategy_validation import collect_validation_errors

    indicator = make_block("sma", {"period": 20}, "sma1")
    entry = make_block("entry_signal", {}, "entry1")
    stop1 = make_block("stop_loss", {"stop_loss_pct": 5.0}, "sl1")
    stop2 = make_block("stop_loss", {"stop_loss_pct": 5.0}, "sl2")
    definition = make_definition(
        [entry, stop1, stop2, indicator],
        [make_connection("sma1", "entry1")],
    )
    codes = [e.code for e in collect_validation_errors(definition)]
    assert "DUPLICATE_RISK" in codes


def test_invalid_connection_from_nonexistent_block():
    from app.services.strategy_validation import collect_validation_errors

    entry = make_block("entry_signal", {}, "entry1")
    indicator = make_block("sma", {"period": 20}, "sma1")
    definition = make_definition(
        [entry, indicator],
        [make_connection("sma1", "entry1"), make_connection("ghost", "entry1")],
    )
    codes = [e.code for e in collect_validation_errors(definition)]
    assert "INVALID_CONNECTION" in codes


def test_invalid_connection_to_nonexistent_block():
    from app.services.strategy_validation import collect_validation_errors

    entry = make_block("entry_signal", {}, "entry1")
    indicator = make_block("sma", {"period": 20}, "sma1")
    definition = make_definition(
        [entry, indicator],
        [make_connection("sma1", "entry1"), make_connection("sma1", "ghost")],
    )
    codes = [e.code for e in collect_validation_errors(definition)]
    assert "INVALID_CONNECTION" in codes


def test_unconnected_signal_raises_error():
    from app.services.strategy_validation import collect_validation_errors

    entry = make_block("entry_signal", {}, "entry1")
    stop = make_block("stop_loss", {"stop_loss_pct": 5.0}, "sl1")
    definition = make_definition([entry, stop], [])
    codes = [e.code for e in collect_validation_errors(definition)]
    assert "UNCONNECTED_SIGNAL" in codes
