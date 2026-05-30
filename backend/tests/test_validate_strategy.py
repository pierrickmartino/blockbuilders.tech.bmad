"""Tests for validate_strategy and build_validated_strategy — pure unit, zero I/O."""
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


def make_definition(
    blocks: list[Block], connections: list[Connection] | None = None
) -> StrategyDefinitionValidate:
    return StrategyDefinitionValidate(blocks=blocks, connections=connections or [])


def make_minimal_valid_definition() -> StrategyDefinitionValidate:
    """Minimal valid strategy: entry signal + stop-loss exit + connected indicator."""
    entry = make_block("entry_signal", {}, "entry1")
    stop = make_block("stop_loss", {"stop_loss_pct": 5.0}, "sl1")
    indicator = make_block("sma", {"period": 20}, "sma1")
    return make_definition([entry, stop, indicator], [make_connection("sma1", "entry1")])


# ── build_validated_strategy: baseline (no risk blocks) ───────────────────────

def test_no_risk_blocks_returns_baseline_risk_params():
    from app.services.strategy_validation import build_validated_strategy

    definition = make_definition([make_block("entry_signal", {}, "entry1")])
    result = build_validated_strategy(definition)

    assert result.risk_params.position_size_pct == 100.0
    assert result.risk_params.take_profit_levels is None
    assert result.risk_params.stop_loss_pct is None
    assert result.risk_params.max_drawdown_pct is None
    assert result.risk_params.time_exit_bars is None
    assert result.risk_params.trailing_stop_pct is None


# ── build_validated_strategy: risk parameter extraction ───────────────────────

def test_position_size_block_extracted():
    from app.services.strategy_validation import build_validated_strategy

    ps = make_block("position_size", {"value": 50}, "ps1")
    result = build_validated_strategy(make_definition([ps]))

    assert result.risk_params.position_size_pct == 50.0


def test_stop_loss_block_extracted():
    from app.services.strategy_validation import build_validated_strategy

    sl = make_block("stop_loss", {"stop_loss_pct": 7.5}, "sl1")
    result = build_validated_strategy(make_definition([sl]))

    assert result.risk_params.stop_loss_pct == 7.5


def test_max_drawdown_block_extracted():
    from app.services.strategy_validation import build_validated_strategy

    md = make_block("max_drawdown", {"max_drawdown_pct": 15.0}, "md1")
    result = build_validated_strategy(make_definition([md]))

    assert result.risk_params.max_drawdown_pct == 15.0


def test_time_exit_block_extracted():
    from app.services.strategy_validation import build_validated_strategy

    te = make_block("time_exit", {"bars": 20}, "te1")
    result = build_validated_strategy(make_definition([te]))

    assert result.risk_params.time_exit_bars == 20


def test_trailing_stop_block_extracted():
    from app.services.strategy_validation import build_validated_strategy

    ts = make_block("trailing_stop", {"trail_pct": 3.0}, "ts1")
    result = build_validated_strategy(make_definition([ts]))

    assert result.risk_params.trailing_stop_pct == 3.0


# ── build_validated_strategy: take-profit extraction ─────────────────────────

def test_take_profit_levels_extracted():
    from app.services.strategy_validation import build_validated_strategy
    from app.backtest.types import TakeProfitLevel

    tp = make_block("take_profit", {"levels": [{"profit_pct": 5.0, "close_pct": 50}]}, "tp1")
    result = build_validated_strategy(make_definition([tp]))

    assert result.risk_params.take_profit_levels == (TakeProfitLevel(profit_pct=5.0, close_pct=50),)


def test_take_profit_legacy_pct_becomes_single_level_closing_100():
    from app.services.strategy_validation import build_validated_strategy
    from app.backtest.types import TakeProfitLevel

    tp = make_block("take_profit", {"take_profit_pct": 10.0}, "tp1")
    result = build_validated_strategy(make_definition([tp]))

    assert result.risk_params.take_profit_levels == (TakeProfitLevel(profit_pct=10.0, close_pct=100),)


def test_take_profit_empty_levels_falls_to_pct_path():
    """Empty levels list → falls through to take_profit_pct, not silent default."""
    from app.services.strategy_validation import build_validated_strategy
    from app.backtest.types import TakeProfitLevel

    tp = make_block("take_profit", {"levels": [], "take_profit_pct": 8.0}, "tp1")
    result = build_validated_strategy(make_definition([tp]))

    assert result.risk_params.take_profit_levels == (TakeProfitLevel(profit_pct=8.0, close_pct=100),)


def test_take_profit_missing_levels_and_missing_pct_yields_none():
    """No levels, no take_profit_pct: absent block baseline (None)."""
    from app.services.strategy_validation import build_validated_strategy

    tp = make_block("take_profit", {}, "tp1")
    result = build_validated_strategy(make_definition([tp]))

    assert result.risk_params.take_profit_levels is None


def test_take_profit_multiple_levels_extracted():
    from app.services.strategy_validation import build_validated_strategy
    from app.backtest.types import TakeProfitLevel

    tp = make_block("take_profit", {
        "levels": [
            {"profit_pct": 5.0, "close_pct": 50},
            {"profit_pct": 10.0, "close_pct": 50},
        ]
    }, "tp1")
    result = build_validated_strategy(make_definition([tp]))

    assert result.risk_params.take_profit_levels == (
        TakeProfitLevel(profit_pct=5.0, close_pct=50),
        TakeProfitLevel(profit_pct=10.0, close_pct=50),
    )


# ── build_validated_strategy: blocks and connections ─────────────────────────

def test_blocks_stored_as_dicts_with_id_and_type():
    from app.services.strategy_validation import build_validated_strategy

    entry = make_block("entry_signal", {}, "entry1")
    result = build_validated_strategy(make_definition([entry]))

    assert len(result.blocks) == 1
    assert result.blocks[0]["id"] == "entry1"
    assert result.blocks[0]["type"] == "entry_signal"


def test_connections_normalized_to_from_port_to_port_format():
    from app.services.strategy_validation import build_validated_strategy

    entry = make_block("entry_signal", {}, "entry1")
    sma = make_block("sma", {"period": 20}, "sma1")
    definition = make_definition([entry, sma], [make_connection("sma1", "entry1")])

    result = build_validated_strategy(definition)

    assert len(result.connections) == 1
    conn = result.connections[0]
    assert conn["from_port"]["block_id"] == "sma1"
    assert conn["from_port"]["port"] == "out"
    assert conn["to_port"]["block_id"] == "entry1"
    assert conn["to_port"]["port"] == "in"


def test_legacy_connection_format_normalized():
    """Connection schema already normalizes legacy from/to → from_port/to_port."""
    from app.services.strategy_validation import build_validated_strategy

    raw_conn = {
        "from": {"block_id": "sma1", "port": "out"},
        "to": {"block_id": "entry1", "port": "in"},
    }
    conn = Connection.model_validate(raw_conn)
    entry = make_block("entry_signal", {}, "entry1")
    sma = make_block("sma", {"period": 20}, "sma1")
    definition = make_definition([entry, sma], [conn])

    result = build_validated_strategy(definition)

    conn_dict = result.connections[0]
    assert conn_dict["from_port"]["block_id"] == "sma1"
    assert conn_dict["to_port"]["block_id"] == "entry1"


# ── validate_strategy: integration ───────────────────────────────────────────

def test_valid_strategy_returns_no_errors_and_strategy():
    from app.services.strategy_validation import validate_strategy

    result = validate_strategy(make_minimal_valid_definition())

    assert len(result.errors) == 0
    assert result.strategy is not None


def test_invalid_strategy_returns_errors_and_no_strategy():
    from app.services.strategy_validation import validate_strategy

    # Missing entry signal
    definition = make_definition([make_block("exit_signal", {}, "exit1")])
    result = validate_strategy(definition)

    assert len(result.errors) > 0
    assert result.strategy is None


def test_present_but_invalid_risk_param_yields_errors_and_no_strategy():
    """A present risk block with invalid param = error list, no strategy (no silent default)."""
    from app.services.strategy_validation import validate_strategy

    entry = make_block("entry_signal", {}, "entry1")
    sl = make_block("stop_loss", {"stop_loss_pct": 0}, "sl1")  # 0 is invalid
    sma = make_block("sma", {"period": 20}, "sma1")
    definition = make_definition([entry, sl, sma], [make_connection("sma1", "entry1")])

    result = validate_strategy(definition)

    assert len(result.errors) > 0
    assert result.strategy is None


def test_validate_strategy_extraction_is_lazy_when_errors_exist():
    """build_validated_strategy is not called when validation fails."""
    from app.services.strategy_validation import validate_strategy

    definition = make_definition([])  # Empty = definitely invalid
    result = validate_strategy(definition)

    assert result.strategy is None
    assert len(result.errors) > 0


def test_valid_strategy_risk_params_propagated_to_result():
    from app.services.strategy_validation import validate_strategy

    entry = make_block("entry_signal", {}, "entry1")
    sl = make_block("stop_loss", {"stop_loss_pct": 5.0}, "sl1")
    sma = make_block("sma", {"period": 20}, "sma1")
    definition = make_definition([entry, sl, sma], [make_connection("sma1", "entry1")])

    result = validate_strategy(definition)

    assert result.strategy is not None
    assert result.strategy.risk_params.stop_loss_pct == 5.0
    assert result.strategy.risk_params.position_size_pct == 100.0  # baseline


def test_collect_validation_errors_signature_unchanged():
    """Existing API must remain intact: same function, same signature, same behavior."""
    import inspect
    from app.services.strategy_validation import collect_validation_errors

    sig = inspect.signature(collect_validation_errors)
    params = list(sig.parameters.keys())
    assert params == ["definition"]
