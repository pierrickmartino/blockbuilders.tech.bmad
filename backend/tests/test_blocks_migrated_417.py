"""Tests for blocks migrated in issue #417: multi-output indicators with cross-param validation."""
from __future__ import annotations

from typing import Any


# ── helpers ───────────────────────────────────────────────────────────────────

def _candle(closes: list[float]) -> dict[str, list]:
    n = len(closes)
    return {
        "open": closes,
        "high": [c + 1.0 for c in closes],
        "low": [c - 1.0 for c in closes],
        "close": closes,
        "prev_close": [None] + closes[:-1],
        "volume": [1000.0] * n,
    }


def _ctx(candle_data: dict, params: dict | None = None) -> Any:
    from app.backtest.catalogue.types import BlockContext
    n = len(candle_data["close"])
    return BlockContext(candle_data=candle_data, params=params or {}, inputs={}, n=n)


# ── MACD ──────────────────────────────────────────────────────────────────────

class TestMacdHandler:
    def test_compute_returns_all_ports(self):
        from app.backtest.catalogue.indicators.macd import MacdHandler
        data = _candle([float(100 + i % 20) for i in range(60)])
        ctx = _ctx(data, {"fast_period": 12, "slow_period": 26, "signal_period": 9})
        result = MacdHandler().compute(ctx)
        for key in ("output", "macd", "signal", "histogram"):
            assert key in result, f"Missing output port: {key}"
            assert len(result[key]) == 60

    def test_compute_output_is_macd_line(self):
        from app.backtest.catalogue.indicators.macd import MacdHandler
        data = _candle([float(100 + i % 20) for i in range(60)])
        ctx = _ctx(data, {"fast_period": 12, "slow_period": 26, "signal_period": 9})
        result = MacdHandler().compute(ctx)
        assert result["output"] is result["macd"]

    def test_validate_rejects_fast_out_of_range(self):
        from app.backtest.catalogue.indicators.macd import MacdHandler
        h = MacdHandler()
        issues = h.validate({"fast_period": 0, "slow_period": 26, "signal_period": 9})
        assert any(i.code == "INVALID_PARAM" for i in issues)

        issues = h.validate({"fast_period": 51, "slow_period": 52, "signal_period": 9})
        assert any(i.code == "INVALID_PARAM" for i in issues)

    def test_validate_rejects_slow_out_of_range(self):
        from app.backtest.catalogue.indicators.macd import MacdHandler
        h = MacdHandler()
        issues = h.validate({"fast_period": 12, "slow_period": 0, "signal_period": 9})
        assert any(i.code == "INVALID_PARAM" for i in issues)

        issues = h.validate({"fast_period": 12, "slow_period": 201, "signal_period": 9})
        assert any(i.code == "INVALID_PARAM" for i in issues)

    def test_validate_rejects_signal_out_of_range(self):
        from app.backtest.catalogue.indicators.macd import MacdHandler
        h = MacdHandler()
        issues = h.validate({"fast_period": 12, "slow_period": 26, "signal_period": 0})
        assert any(i.code == "INVALID_PARAM" for i in issues)

        issues = h.validate({"fast_period": 12, "slow_period": 26, "signal_period": 51})
        assert any(i.code == "INVALID_PARAM" for i in issues)

    def test_validate_rejects_fast_not_less_than_slow(self):
        from app.backtest.catalogue.indicators.macd import MacdHandler
        h = MacdHandler()
        issues = h.validate({"fast_period": 26, "slow_period": 26, "signal_period": 9})
        assert len(issues) >= 1
        assert any(i.code == "FAST_NOT_LESS_THAN_SLOW" for i in issues)

        issues = h.validate({"fast_period": 30, "slow_period": 26, "signal_period": 9})
        assert any(i.code == "FAST_NOT_LESS_THAN_SLOW" for i in issues)

    def test_validate_accepts_valid_params(self):
        from app.backtest.catalogue.indicators.macd import MacdHandler
        h = MacdHandler()
        assert h.validate({"fast_period": 12, "slow_period": 26, "signal_period": 9}) == []
        assert h.validate({}) == []

    def test_spec_type_category_and_outputs(self):
        from app.backtest.catalogue.indicators.macd import MacdHandler
        h = MacdHandler()
        assert h.spec.type == "macd"
        assert h.spec.category == "indicator"
        output_names = {p.name for p in h.spec.outputs}
        assert {"output", "macd", "signal", "histogram"}.issubset(output_names)

    def test_spec_param_bounds_match_legacy(self):
        from app.backtest.catalogue.indicators.macd import MacdHandler
        h = MacdHandler()
        params = {p.name: p for p in h.spec.params}
        assert params["fast_period"].min == 1
        assert params["fast_period"].max == 50
        assert params["slow_period"].min == 1
        assert params["slow_period"].max == 200
        assert params["signal_period"].min == 1
        assert params["signal_period"].max == 50


# ── Bollinger Bands ───────────────────────────────────────────────────────────

class TestBollingerHandler:
    def test_compute_returns_all_ports(self):
        from app.backtest.catalogue.indicators.bollinger import BollingerHandler
        data = _candle([float(100 + i % 10) for i in range(40)])
        ctx = _ctx(data, {"period": 20, "stddev": 2.0})
        result = BollingerHandler().compute(ctx)
        for key in ("output", "upper", "middle", "lower"):
            assert key in result, f"Missing output port: {key}"
            assert len(result[key]) == 40

    def test_compute_output_is_middle_band(self):
        from app.backtest.catalogue.indicators.bollinger import BollingerHandler
        data = _candle([float(100 + i % 10) for i in range(40)])
        ctx = _ctx(data, {"period": 20, "stddev": 2.0})
        result = BollingerHandler().compute(ctx)
        assert result["output"] is result["middle"]

    def test_validate_rejects_period_out_of_range(self):
        from app.backtest.catalogue.indicators.bollinger import BollingerHandler
        h = BollingerHandler()
        issues = h.validate({"period": 0, "stddev": 2.0})
        assert any(i.code == "INVALID_PERIOD" for i in issues)

        issues = h.validate({"period": 501, "stddev": 2.0})
        assert any(i.code == "INVALID_PERIOD" for i in issues)

    def test_validate_rejects_stddev_not_positive(self):
        from app.backtest.catalogue.indicators.bollinger import BollingerHandler
        h = BollingerHandler()
        issues = h.validate({"period": 20, "stddev": 0})
        assert any(i.code == "INVALID_STDDEV" for i in issues)

        issues = h.validate({"period": 20, "stddev": -1.0})
        assert any(i.code == "INVALID_STDDEV" for i in issues)

    def test_validate_accepts_valid_params(self):
        from app.backtest.catalogue.indicators.bollinger import BollingerHandler
        h = BollingerHandler()
        assert h.validate({"period": 20, "stddev": 2.0}) == []
        assert h.validate({}) == []

    def test_spec_type_category_and_outputs(self):
        from app.backtest.catalogue.indicators.bollinger import BollingerHandler
        h = BollingerHandler()
        assert h.spec.type == "bollinger"
        assert h.spec.category == "indicator"
        output_names = {p.name for p in h.spec.outputs}
        assert {"output", "upper", "middle", "lower"}.issubset(output_names)

    def test_spec_period_param_matches_legacy(self):
        from app.backtest.catalogue.indicators.bollinger import BollingerHandler
        h = BollingerHandler()
        params = {p.name: p for p in h.spec.params}
        assert params["period"].min == 1
        assert params["period"].max == 500


# ── Stochastic ────────────────────────────────────────────────────────────────

class TestStochasticHandler:
    def test_compute_returns_all_ports(self):
        from app.backtest.catalogue.indicators.stochastic import StochasticHandler
        data = _candle([float(100 + i % 20) for i in range(40)])
        ctx = _ctx(data, {"k_period": 14, "d_period": 3, "smooth": 3})
        result = StochasticHandler().compute(ctx)
        for key in ("output", "k", "d"):
            assert key in result, f"Missing output port: {key}"
            assert len(result[key]) == 40

    def test_compute_output_is_k_line(self):
        from app.backtest.catalogue.indicators.stochastic import StochasticHandler
        data = _candle([float(100 + i % 20) for i in range(40)])
        ctx = _ctx(data, {"k_period": 14, "d_period": 3, "smooth": 3})
        result = StochasticHandler().compute(ctx)
        assert result["output"] is result["k"]

    def test_validate_rejects_k_period_out_of_range(self):
        from app.backtest.catalogue.indicators.stochastic import StochasticHandler
        h = StochasticHandler()
        issues = h.validate({"k_period": 0, "d_period": 3, "smooth": 3})
        assert any(i.code == "INVALID_PARAM" for i in issues)

        issues = h.validate({"k_period": 101, "d_period": 3, "smooth": 3})
        assert any(i.code == "INVALID_PARAM" for i in issues)

    def test_validate_rejects_smooth_below_one(self):
        from app.backtest.catalogue.indicators.stochastic import StochasticHandler
        h = StochasticHandler()
        issues = h.validate({"k_period": 14, "d_period": 3, "smooth": 0})
        assert any(i.code == "INVALID_PARAM" for i in issues)

    def test_validate_accepts_valid_params(self):
        from app.backtest.catalogue.indicators.stochastic import StochasticHandler
        h = StochasticHandler()
        assert h.validate({"k_period": 14, "d_period": 3, "smooth": 3}) == []
        assert h.validate({}) == []

    def test_spec_type_category_and_outputs(self):
        from app.backtest.catalogue.indicators.stochastic import StochasticHandler
        h = StochasticHandler()
        assert h.spec.type == "stochastic"
        assert h.spec.category == "indicator"
        output_names = {p.name for p in h.spec.outputs}
        assert {"output", "k", "d"}.issubset(output_names)

    def test_spec_has_no_source_param(self):
        from app.backtest.catalogue.indicators.stochastic import StochasticHandler
        h = StochasticHandler()
        param_names = [p.name for p in h.spec.params]
        assert "source" not in param_names
        assert "k_period" in param_names


# ── ADX ───────────────────────────────────────────────────────────────────────

class TestAdxHandler:
    def test_compute_returns_all_ports(self):
        from app.backtest.catalogue.indicators.adx import AdxHandler
        data = _candle([float(100 + i % 20) for i in range(40)])
        ctx = _ctx(data, {"period": 14})
        result = AdxHandler().compute(ctx)
        for key in ("output", "adx", "plus_di", "minus_di"):
            assert key in result, f"Missing output port: {key}"
            assert len(result[key]) == 40

    def test_compute_output_is_adx_line(self):
        from app.backtest.catalogue.indicators.adx import AdxHandler
        data = _candle([float(100 + i % 20) for i in range(40)])
        ctx = _ctx(data, {"period": 14})
        result = AdxHandler().compute(ctx)
        assert result["output"] is result["adx"]

    def test_validate_rejects_period_out_of_range(self):
        from app.backtest.catalogue.indicators.adx import AdxHandler
        h = AdxHandler()
        issues = h.validate({"period": 0})
        assert any(i.code == "INVALID_PERIOD" for i in issues)

        issues = h.validate({"period": 101})
        assert any(i.code == "INVALID_PERIOD" for i in issues)

    def test_validate_accepts_valid_params(self):
        from app.backtest.catalogue.indicators.adx import AdxHandler
        h = AdxHandler()
        assert h.validate({"period": 14}) == []
        assert h.validate({}) == []

    def test_spec_type_category_and_outputs(self):
        from app.backtest.catalogue.indicators.adx import AdxHandler
        h = AdxHandler()
        assert h.spec.type == "adx"
        assert h.spec.category == "indicator"
        output_names = {p.name for p in h.spec.outputs}
        assert {"output", "adx", "plus_di", "minus_di"}.issubset(output_names)

    def test_spec_has_no_source_param(self):
        from app.backtest.catalogue.indicators.adx import AdxHandler
        h = AdxHandler()
        param_names = [p.name for p in h.spec.params]
        assert "source" not in param_names
        assert "period" in param_names


# ── Registry integrity ────────────────────────────────────────────────────────

def test_all_417_blocks_in_catalogue():
    from app.backtest.catalogue import lookup
    for block_type in ("macd", "bollinger", "stochastic", "adx"):
        handler = lookup(block_type)
        assert handler is not None, f"Block '{block_type}' not found in catalogue"
        assert handler.spec.type == block_type


# ── Validator uses catalogue for new blocks ───────────────────────────────────

def test_validator_uses_catalogue_for_macd_cross_param():
    from app.schemas.strategy import Block, BlockPosition
    from app.services.strategy_validation import validate_block_params

    block = Block(
        id="b1", type="macd", label="MACD",
        position=BlockPosition(x=0, y=0),
        params={"fast_period": 30, "slow_period": 26, "signal_period": 9},
    )
    errors = validate_block_params(block)
    assert len(errors) >= 1
    assert any(e.code == "FAST_NOT_LESS_THAN_SLOW" for e in errors)


def test_validator_accepts_valid_macd():
    from app.schemas.strategy import Block, BlockPosition
    from app.services.strategy_validation import validate_block_params

    block = Block(
        id="b1", type="macd", label="MACD",
        position=BlockPosition(x=0, y=0),
        params={"fast_period": 12, "slow_period": 26, "signal_period": 9},
    )
    assert validate_block_params(block) == []


def test_validator_uses_catalogue_for_bollinger_bad_period():
    from app.schemas.strategy import Block, BlockPosition
    from app.services.strategy_validation import validate_block_params

    block = Block(
        id="b1", type="bollinger", label="Bollinger",
        position=BlockPosition(x=0, y=0),
        params={"period": 0, "stddev": 2.0},
    )
    errors = validate_block_params(block)
    assert len(errors) >= 1
    assert any(e.code == "INVALID_PERIOD" for e in errors)


# ── Interpreter dispatches new blocks via catalogue ───────────────────────────

def test_interpreter_dispatches_macd_via_catalogue():
    from datetime import datetime, timedelta, timezone
    from uuid import uuid4
    from app.backtest.interpreter import interpret_strategy
    from app.models.candle import Candle

    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles = [
        Candle(
            id=uuid4(), asset="BTC/USDT", timeframe="1d",
            timestamp=start + timedelta(days=i),
            open=100.0, high=101.0, low=99.0, close=100.0 + float(i % 20), volume=1000.0,
        )
        for i in range(60)
    ]
    definition = {
        "blocks": [
            {"id": "macd-1", "type": "macd", "params": {"fast_period": 12, "slow_period": 26, "signal_period": 9}},
            {"id": "const-1", "type": "constant", "params": {"value": 0.0}},
            {"id": "cmp-1", "type": "compare", "params": {"operator": ">"}},
            {"id": "entry-1", "type": "entry_signal", "params": {}},
            {"id": "exit-1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "macd-1", "port": "macd"}, "to": {"block_id": "cmp-1", "port": "left"}},
            {"from": {"block_id": "const-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "right"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "entry-1", "port": "signal"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "exit-1", "port": "signal"}},
        ],
    }
    from app.backtest.types import RiskParams, ValidatedStrategy
    strategy = ValidatedStrategy(
        blocks=tuple(definition["blocks"]),
        connections=tuple(
            {"from_port": c["from"], "to_port": c["to"]} for c in definition["connections"]
        ),
        risk_params=RiskParams(),
    )
    signals = interpret_strategy(strategy, candles)
    assert isinstance(signals.entry_long, list)


def test_interpreter_dispatches_bollinger_via_catalogue():
    from datetime import datetime, timedelta, timezone
    from uuid import uuid4
    from app.backtest.interpreter import interpret_strategy
    from app.models.candle import Candle

    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles = [
        Candle(
            id=uuid4(), asset="BTC/USDT", timeframe="1d",
            timestamp=start + timedelta(days=i),
            open=100.0, high=101.0, low=99.0, close=100.0 + float(i % 10), volume=1000.0,
        )
        for i in range(40)
    ]
    definition = {
        "blocks": [
            {"id": "price-1", "type": "price", "params": {"source": "close"}},
            {"id": "boll-1", "type": "bollinger", "params": {"period": 20, "stddev": 2.0}},
            {"id": "cmp-1", "type": "compare", "params": {"operator": ">"}},
            {"id": "entry-1", "type": "entry_signal", "params": {}},
            {"id": "exit-1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "price-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "left"}},
            {"from": {"block_id": "boll-1", "port": "lower"}, "to": {"block_id": "cmp-1", "port": "right"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "entry-1", "port": "signal"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "exit-1", "port": "signal"}},
        ],
    }
    from app.backtest.types import RiskParams, ValidatedStrategy
    strategy = ValidatedStrategy(
        blocks=tuple(definition["blocks"]),
        connections=tuple(
            {"from_port": c["from"], "to_port": c["to"]} for c in definition["connections"]
        ),
        risk_params=RiskParams(),
    )
    signals = interpret_strategy(strategy, candles)
    assert isinstance(signals.entry_long, list)
