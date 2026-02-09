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
