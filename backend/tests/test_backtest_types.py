"""Tests for backtest types module — pure unit, zero I/O."""
import pytest


def test_take_profit_level_stores_values():
    from app.backtest.types import TakeProfitLevel

    lvl = TakeProfitLevel(profit_pct=10.0, close_pct=50)
    assert lvl.profit_pct == 10.0
    assert lvl.close_pct == 50


def test_take_profit_level_is_frozen():
    from app.backtest.types import TakeProfitLevel

    lvl = TakeProfitLevel(profit_pct=10.0, close_pct=50)
    with pytest.raises(Exception):  # FrozenInstanceError is a subclass of AttributeError
        lvl.profit_pct = 20.0


def test_risk_params_baseline_defaults():
    from app.backtest.types import RiskParams

    rp = RiskParams()
    assert rp.position_size_pct == 100.0
    assert rp.take_profit_levels is None
    assert rp.stop_loss_pct is None
    assert rp.max_drawdown_pct is None
    assert rp.time_exit_bars is None
    assert rp.trailing_stop_pct is None


def test_risk_params_is_frozen():
    from app.backtest.types import RiskParams

    rp = RiskParams()
    with pytest.raises(Exception):
        rp.position_size_pct = 50.0


def test_risk_params_accepts_values():
    from app.backtest.types import RiskParams, TakeProfitLevel

    levels = (TakeProfitLevel(profit_pct=5.0, close_pct=100),)
    rp = RiskParams(
        position_size_pct=50.0,
        take_profit_levels=levels,
        stop_loss_pct=3.0,
        max_drawdown_pct=10.0,
        time_exit_bars=20,
        trailing_stop_pct=2.5,
    )
    assert rp.position_size_pct == 50.0
    assert rp.take_profit_levels == levels
    assert rp.stop_loss_pct == 3.0
    assert rp.max_drawdown_pct == 10.0
    assert rp.time_exit_bars == 20
    assert rp.trailing_stop_pct == 2.5


def test_validated_strategy_stores_data():
    from app.backtest.types import ValidatedStrategy, RiskParams

    blocks = ({"id": "b1", "type": "entry_signal"},)
    connections = ({"from_port": {"block_id": "sma1", "port": "out"}, "to_port": {"block_id": "b1", "port": "in"}},)
    rp = RiskParams()
    vs = ValidatedStrategy(blocks=blocks, connections=connections, risk_params=rp)

    assert vs.blocks == blocks
    assert vs.connections == connections
    assert vs.risk_params is rp


def test_validated_strategy_is_frozen():
    from app.backtest.types import ValidatedStrategy, RiskParams

    vs = ValidatedStrategy(blocks=(), connections=(), risk_params=RiskParams())
    with pytest.raises(Exception):
        vs.blocks = ({"id": "new"},)


def test_validation_result_no_errors_with_strategy():
    from app.backtest.types import ValidationResult, ValidatedStrategy, RiskParams

    vs = ValidatedStrategy(blocks=(), connections=(), risk_params=RiskParams())
    result = ValidationResult(errors=(), strategy=vs)

    assert len(result.errors) == 0
    assert result.strategy is vs


def test_validation_result_defaults_to_no_strategy():
    from app.backtest.types import ValidationResult

    result = ValidationResult(errors=())
    assert result.strategy is None


def test_validation_result_is_frozen():
    from app.backtest.types import ValidationResult

    result = ValidationResult(errors=())
    with pytest.raises(Exception):
        result.errors = ("something",)


def test_interpreter_still_exports_take_profit_level():
    """Interpreter re-exports TakeProfitLevel from types — backward compat."""
    from app.backtest.interpreter import TakeProfitLevel

    lvl = TakeProfitLevel(profit_pct=5.0, close_pct=100)
    assert lvl.profit_pct == 5.0
