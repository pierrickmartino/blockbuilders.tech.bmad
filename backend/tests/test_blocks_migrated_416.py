"""Tests for blocks migrated in issue #416: source + single-output indicator blocks."""
from __future__ import annotations

from typing import Any


# ── helpers ───────────────────────────────────────────────────────────────────

def _candle(closes: list[float]) -> dict[str, list]:
    n = len(closes)
    prev_closes = [None] + closes[:-1]
    return {
        "open": closes,
        "high": [c + 1.0 for c in closes],
        "low": [c - 1.0 for c in closes],
        "close": closes,
        "prev_close": prev_closes,
        "volume": [1000.0] * n,
    }


def _ctx(candle_data: dict, params: dict | None = None) -> Any:
    from app.backtest.catalogue.types import BlockContext
    n = len(candle_data["close"])
    return BlockContext(candle_data=candle_data, params=params or {}, inputs={}, n=n)


# ── Cycle 1: source blocks ────────────────────────────────────────────────────

class TestPriceHandler:
    def test_compute_returns_close_by_default(self):
        from app.backtest.catalogue.sources.price import PriceHandler
        data = _candle([10.0, 11.0, 12.0])
        result = PriceHandler().compute(_ctx(data))
        assert result["output"] == [10.0, 11.0, 12.0]

    def test_compute_returns_selected_source(self):
        from app.backtest.catalogue.sources.price import PriceHandler
        data = _candle([10.0, 11.0, 12.0])
        ctx = _ctx(data, {"source": "volume"})
        result = PriceHandler().compute(ctx)
        assert result["output"] == [1000.0, 1000.0, 1000.0]

    def test_validate_returns_empty(self):
        from app.backtest.catalogue.sources.price import PriceHandler
        assert PriceHandler().validate({}) == []
        assert PriceHandler().validate({"source": "open"}) == []

    def test_spec_type_and_category(self):
        from app.backtest.catalogue.sources.price import PriceHandler
        h = PriceHandler()
        assert h.spec.type == "price"
        assert h.spec.category == "input"
        assert len(h.spec.outputs) == 1
        assert h.spec.outputs[0].name == "output"


class TestVolumeHandler:
    def test_compute_returns_volume_series(self):
        from app.backtest.catalogue.sources.volume import VolumeHandler
        data = _candle([10.0, 11.0])
        data["volume"] = [500.0, 600.0]
        result = VolumeHandler().compute(_ctx(data))
        assert result["output"] == [500.0, 600.0]

    def test_validate_returns_empty(self):
        from app.backtest.catalogue.sources.volume import VolumeHandler
        assert VolumeHandler().validate({}) == []

    def test_spec_type_and_category(self):
        from app.backtest.catalogue.sources.volume import VolumeHandler
        h = VolumeHandler()
        assert h.spec.type == "volume"
        assert h.spec.category == "input"
        assert h.spec.params == ()


class TestConstantHandler:
    def test_compute_returns_repeated_value(self):
        from app.backtest.catalogue.sources.constant import ConstantHandler
        data = _candle([1.0, 2.0, 3.0])
        ctx = _ctx(data, {"value": 42.5})
        result = ConstantHandler().compute(ctx)
        assert result["output"] == [42.5, 42.5, 42.5]

    def test_compute_uses_default_zero(self):
        from app.backtest.catalogue.sources.constant import ConstantHandler
        data = _candle([1.0, 2.0])
        result = ConstantHandler().compute(_ctx(data))
        assert result["output"] == [0.0, 0.0]

    def test_validate_rejects_non_numeric(self):
        from app.backtest.catalogue.sources.constant import ConstantHandler
        issues = ConstantHandler().validate({"value": "bad"})
        assert len(issues) == 1
        assert issues[0].code == "INVALID_VALUE"

    def test_validate_rejects_out_of_range(self):
        from app.backtest.catalogue.sources.constant import ConstantHandler
        issues = ConstantHandler().validate({"value": 2_000_000})
        assert len(issues) == 1
        assert issues[0].code == "INVALID_VALUE"

        issues = ConstantHandler().validate({"value": -2_000_000})
        assert len(issues) == 1
        assert issues[0].code == "INVALID_VALUE"

    def test_validate_accepts_valid(self):
        from app.backtest.catalogue.sources.constant import ConstantHandler
        assert ConstantHandler().validate({"value": 0}) == []
        assert ConstantHandler().validate({"value": 1_000_000}) == []
        assert ConstantHandler().validate({"value": -1_000_000}) == []
        assert ConstantHandler().validate({}) == []

    def test_spec_type(self):
        from app.backtest.catalogue.sources.constant import ConstantHandler
        assert ConstantHandler().spec.type == "constant"
        assert ConstantHandler().spec.category == "input"


class TestYesterdayCloseHandler:
    def test_compute_shifts_close_by_one(self):
        from app.backtest.catalogue.sources.yesterday_close import YesterdayCloseHandler
        data = _candle([10.0, 11.0, 12.0])
        result = YesterdayCloseHandler().compute(_ctx(data))
        assert result["output"] == [None, 10.0, 11.0]

    def test_validate_returns_empty(self):
        from app.backtest.catalogue.sources.yesterday_close import YesterdayCloseHandler
        assert YesterdayCloseHandler().validate({}) == []

    def test_spec_type_and_category(self):
        from app.backtest.catalogue.sources.yesterday_close import YesterdayCloseHandler
        h = YesterdayCloseHandler()
        assert h.spec.type == "yesterday_close"
        assert h.spec.category == "input"
        assert h.spec.params == ()


# ── Cycle 2: single-output indicator blocks ───────────────────────────────────

class TestEmaHandler:
    def test_compute_returns_output_list(self):
        from app.backtest.catalogue.indicators.ema import EmaHandler
        data = _candle([float(i) for i in range(1, 25)])
        ctx = _ctx(data, {"period": 5, "source": "close"})
        result = EmaHandler().compute(ctx)
        assert "output" in result
        assert len(result["output"]) == 24

    def test_compute_warms_up_correctly(self):
        from app.backtest.catalogue.indicators.ema import EmaHandler
        data = _candle([10.0] * 10)
        ctx = _ctx(data, {"period": 5, "source": "close"})
        result = EmaHandler().compute(ctx)
        assert result["output"][0] is None
        assert result["output"][4] is not None

    def test_validate_rejects_period_out_of_range(self):
        from app.backtest.catalogue.indicators.ema import EmaHandler
        issues = EmaHandler().validate({"period": 0})
        assert len(issues) == 1
        assert issues[0].code == "INVALID_PERIOD"

        issues = EmaHandler().validate({"period": 501})
        assert len(issues) == 1

    def test_validate_accepts_valid(self):
        from app.backtest.catalogue.indicators.ema import EmaHandler
        assert EmaHandler().validate({"period": 20}) == []
        assert EmaHandler().validate({}) == []

    def test_spec_type_and_category(self):
        from app.backtest.catalogue.indicators.ema import EmaHandler
        h = EmaHandler()
        assert h.spec.type == "ema"
        assert h.spec.category == "indicator"
        period_param = next(p for p in h.spec.params if p.name == "period")
        assert period_param.min == 1
        assert period_param.max == 500
        assert period_param.default == 20


class TestRsiHandler:
    def test_compute_returns_output_list(self):
        from app.backtest.catalogue.indicators.rsi import RsiHandler
        data = _candle([float(i) for i in range(1, 25)])
        ctx = _ctx(data, {"period": 14, "source": "close"})
        result = RsiHandler().compute(ctx)
        assert "output" in result
        assert len(result["output"]) == 24

    def test_validate_rejects_period_below_2(self):
        from app.backtest.catalogue.indicators.rsi import RsiHandler
        issues = RsiHandler().validate({"period": 1})
        assert len(issues) == 1
        assert issues[0].code == "INVALID_PERIOD"

    def test_validate_rejects_period_above_100(self):
        from app.backtest.catalogue.indicators.rsi import RsiHandler
        issues = RsiHandler().validate({"period": 101})
        assert len(issues) == 1

    def test_validate_accepts_valid(self):
        from app.backtest.catalogue.indicators.rsi import RsiHandler
        assert RsiHandler().validate({"period": 14}) == []
        assert RsiHandler().validate({}) == []

    def test_spec_type_and_category(self):
        from app.backtest.catalogue.indicators.rsi import RsiHandler
        h = RsiHandler()
        assert h.spec.type == "rsi"
        assert h.spec.category == "indicator"
        period_param = next(p for p in h.spec.params if p.name == "period")
        assert period_param.min == 2
        assert period_param.max == 100
        assert period_param.default == 14


class TestAtrHandler:
    def test_compute_returns_output_list(self):
        from app.backtest.catalogue.indicators.atr import AtrHandler
        data = _candle([float(i + 100) for i in range(20)])
        ctx = _ctx(data, {"period": 5})
        result = AtrHandler().compute(ctx)
        assert "output" in result
        assert len(result["output"]) == 20

    def test_validate_rejects_period_out_of_range(self):
        from app.backtest.catalogue.indicators.atr import AtrHandler
        issues = AtrHandler().validate({"period": 0})
        assert len(issues) == 1
        assert issues[0].code == "INVALID_PERIOD"

        issues = AtrHandler().validate({"period": 501})
        assert len(issues) == 1

    def test_validate_accepts_valid(self):
        from app.backtest.catalogue.indicators.atr import AtrHandler
        assert AtrHandler().validate({"period": 14}) == []
        assert AtrHandler().validate({}) == []

    def test_spec_has_no_source_param(self):
        from app.backtest.catalogue.indicators.atr import AtrHandler
        h = AtrHandler()
        assert h.spec.type == "atr"
        param_names = [p.name for p in h.spec.params]
        assert "source" not in param_names
        assert "period" in param_names


class TestObvHandler:
    def test_compute_returns_output_list(self):
        from app.backtest.catalogue.indicators.obv import ObvHandler
        data = _candle([10.0, 11.0, 10.5, 12.0])
        result = ObvHandler().compute(_ctx(data))
        assert "output" in result
        assert len(result["output"]) == 4

    def test_validate_returns_empty(self):
        from app.backtest.catalogue.indicators.obv import ObvHandler
        assert ObvHandler().validate({}) == []

    def test_spec_type_category_no_params(self):
        from app.backtest.catalogue.indicators.obv import ObvHandler
        h = ObvHandler()
        assert h.spec.type == "obv"
        assert h.spec.category == "indicator"
        assert h.spec.params == ()


class TestPriceVariationPctHandler:
    def test_compute_returns_output_list(self):
        from app.backtest.catalogue.indicators.price_variation_pct import PriceVariationPctHandler
        data = _candle([100.0, 110.0, 99.0, 115.0])
        result = PriceVariationPctHandler().compute(_ctx(data))
        assert "output" in result
        assert len(result["output"]) == 4

    def test_validate_returns_empty(self):
        from app.backtest.catalogue.indicators.price_variation_pct import PriceVariationPctHandler
        assert PriceVariationPctHandler().validate({}) == []

    def test_spec_type(self):
        from app.backtest.catalogue.indicators.price_variation_pct import PriceVariationPctHandler
        h = PriceVariationPctHandler()
        assert h.spec.type == "price_variation_pct"
        assert h.spec.category == "indicator"
        assert h.spec.params == ()


# ── Cycle 3: multi-output indicators ─────────────────────────────────────────

class TestIchimokuHandler:
    def test_compute_returns_all_ports(self):
        from app.backtest.catalogue.indicators.ichimoku import IchimokuHandler
        data = _candle([float(100 + i) for i in range(60)])
        ctx = _ctx(data, {"conversion": 9, "base": 26, "span_b": 52, "displacement": 26})
        result = IchimokuHandler().compute(ctx)
        for key in ("output", "conversion", "base", "span_a", "span_b"):
            assert key in result, f"Missing output port: {key}"
            assert len(result[key]) == 60

    def test_validate_returns_empty_always(self):
        from app.backtest.catalogue.indicators.ichimoku import IchimokuHandler
        assert IchimokuHandler().validate({}) == []
        assert IchimokuHandler().validate({"conversion": 9, "base": 26, "span_b": 52, "displacement": 26}) == []

    def test_spec_multi_output_ports(self):
        from app.backtest.catalogue.indicators.ichimoku import IchimokuHandler
        h = IchimokuHandler()
        assert h.spec.type == "ichimoku"
        assert h.spec.category == "indicator"
        output_names = {p.name for p in h.spec.outputs}
        assert {"output", "conversion", "base", "span_a", "span_b"}.issubset(output_names)

    def test_spec_params(self):
        from app.backtest.catalogue.indicators.ichimoku import IchimokuHandler
        h = IchimokuHandler()
        param_names = {p.name for p in h.spec.params}
        assert {"conversion", "base", "span_b", "displacement"} == param_names


class TestFibonacciHandler:
    def test_compute_returns_all_level_ports(self):
        from app.backtest.catalogue.indicators.fibonacci import FibonacciHandler
        data = _candle([float(100 + i % 10) for i in range(60)])
        ctx = _ctx(data, {"lookback": 20})
        result = FibonacciHandler().compute(ctx)
        for key in ("output", "level_236", "level_382", "level_5", "level_618", "level_786"):
            assert key in result, f"Missing port: {key}"
            assert len(result[key]) == 60

    def test_validate_rejects_lookback_below_10(self):
        from app.backtest.catalogue.indicators.fibonacci import FibonacciHandler
        issues = FibonacciHandler().validate({"lookback": 5})
        assert len(issues) == 1
        assert issues[0].code == "INVALID_LOOKBACK"

    def test_validate_rejects_lookback_above_500(self):
        from app.backtest.catalogue.indicators.fibonacci import FibonacciHandler
        issues = FibonacciHandler().validate({"lookback": 501})
        assert len(issues) == 1

    def test_validate_accepts_valid(self):
        from app.backtest.catalogue.indicators.fibonacci import FibonacciHandler
        assert FibonacciHandler().validate({"lookback": 50}) == []
        assert FibonacciHandler().validate({}) == []

    def test_spec_multi_output_ports(self):
        from app.backtest.catalogue.indicators.fibonacci import FibonacciHandler
        h = FibonacciHandler()
        assert h.spec.type == "fibonacci"
        output_names = {p.name for p in h.spec.outputs}
        assert {"output", "level_236", "level_382", "level_5", "level_618", "level_786"}.issubset(output_names)


# ── Cycle 4: all 11 blocks registered in catalogue ───────────────────────────

def test_all_migrated_blocks_in_catalogue():
    from app.backtest.catalogue import lookup
    migrated = [
        "price", "volume", "constant", "yesterday_close",
        "ema", "rsi", "atr", "obv", "price_variation_pct",
        "ichimoku", "fibonacci",
    ]
    for block_type in migrated:
        handler = lookup(block_type)
        assert handler is not None, f"Block '{block_type}' not found in catalogue"
        assert handler.spec.type == block_type


# ── Cycle 5: interpreter dispatches migrated blocks via catalogue ─────────────

def test_interpreter_dispatches_price_via_catalogue():
    from datetime import datetime, timedelta, timezone
    from uuid import uuid4
    from app.backtest.interpreter import interpret_strategy
    from app.models.candle import Candle

    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles = [
        Candle(
            id=uuid4(), asset="BTC/USDT", timeframe="1d",
            timestamp=start + timedelta(days=i),
            open=100.0, high=101.0, low=99.0, close=100.0 + float(i), volume=1000.0,
        )
        for i in range(30)
    ]
    definition = {
        "blocks": [
            {"id": "price-1", "type": "price", "params": {"source": "close"}},
            {"id": "const-1", "type": "constant", "params": {"value": 110.0}},
            {"id": "cmp-1", "type": "compare", "params": {"operator": ">"}},
            {"id": "entry-1", "type": "entry_signal", "params": {}},
            {"id": "exit-1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "price-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "left"}},
            {"from": {"block_id": "const-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "right"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "entry-1", "port": "signal"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "exit-1", "port": "signal"}},
        ],
    }
    signals = interpret_strategy(definition, candles)
    assert any(signals.entry_long)


def test_interpreter_dispatches_ema_via_catalogue():
    from datetime import datetime, timedelta, timezone
    from uuid import uuid4
    from app.backtest.interpreter import interpret_strategy
    from app.models.candle import Candle

    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles = [
        Candle(
            id=uuid4(), asset="BTC/USDT", timeframe="1d",
            timestamp=start + timedelta(days=i),
            open=100.0, high=101.0, low=99.0, close=100.0 + float(i), volume=1000.0,
        )
        for i in range(30)
    ]
    definition = {
        "blocks": [
            {"id": "price-1", "type": "price", "params": {"source": "close"}},
            {"id": "ema-1", "type": "ema", "params": {"period": 5, "source": "close"}},
            {"id": "cmp-1", "type": "compare", "params": {"operator": ">"}},
            {"id": "entry-1", "type": "entry_signal", "params": {}},
            {"id": "exit-1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "price-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "left"}},
            {"from": {"block_id": "ema-1", "port": "output"}, "to": {"block_id": "cmp-1", "port": "right"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "entry-1", "port": "signal"}},
            {"from": {"block_id": "cmp-1", "port": "output"}, "to": {"block_id": "exit-1", "port": "signal"}},
        ],
    }
    signals = interpret_strategy(definition, candles)
    assert any(signals.entry_long)


# ── Cycle 6: validator uses catalogue for migrated blocks ─────────────────────

def test_validator_uses_catalogue_for_constant_invalid():
    from app.schemas.strategy import Block, BlockPosition
    from app.services.strategy_validation import validate_block_params

    block = Block(id="b1", type="constant", label="Constant",
                  position=BlockPosition(x=0, y=0), params={"value": 2_000_000})
    errors = validate_block_params(block)
    assert len(errors) >= 1
    assert any(e.code == "INVALID_VALUE" for e in errors)


def test_validator_uses_catalogue_for_ema_invalid():
    from app.schemas.strategy import Block, BlockPosition
    from app.services.strategy_validation import validate_block_params

    block = Block(id="b1", type="ema", label="EMA",
                  position=BlockPosition(x=0, y=0), params={"period": 999})
    errors = validate_block_params(block)
    assert len(errors) >= 1
    assert any(e.code == "INVALID_PERIOD" for e in errors)


def test_validator_uses_catalogue_for_rsi_invalid():
    from app.schemas.strategy import Block, BlockPosition
    from app.services.strategy_validation import validate_block_params

    block = Block(id="b1", type="rsi", label="RSI",
                  position=BlockPosition(x=0, y=0), params={"period": 1})
    errors = validate_block_params(block)
    assert len(errors) >= 1


def test_validator_accepts_valid_rsi():
    from app.schemas.strategy import Block, BlockPosition
    from app.services.strategy_validation import validate_block_params

    block = Block(id="b1", type="rsi", label="RSI",
                  position=BlockPosition(x=0, y=0), params={"period": 14})
    assert validate_block_params(block) == []
