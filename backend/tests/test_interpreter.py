"""Tests for strategy interpreter signal wiring and evaluation.

Tests construct ValidatedStrategy directly via make_validated_strategy,
decoupled from the validation pipeline.
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from app.backtest.interpreter import interpret_strategy
from app.backtest.types import RiskParams, TakeProfitLevel, ValidatedStrategy
from app.models.candle import Candle


# ── test helpers ──────────────────────────────────────────────────────────────

def make_block_dict(block_id: str, block_type: str, params: dict | None = None) -> dict:
    return {"id": block_id, "type": block_type, "params": params or {}}


def make_connection_dict(from_block: str, from_port: str, to_block: str, to_port: str) -> dict:
    return {
        "from_port": {"block_id": from_block, "port": from_port},
        "to_port": {"block_id": to_block, "port": to_port},
    }


def make_validated_strategy(
    blocks: list[dict],
    connections: list[dict] | None = None,
    risk_params: RiskParams | None = None,
) -> ValidatedStrategy:
    """Build a ValidatedStrategy directly for interpreter testing."""
    return ValidatedStrategy(
        blocks=tuple(blocks),
        connections=tuple(connections or []),
        risk_params=risk_params or RiskParams(),
    )


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


# ── tracer bullet ─────────────────────────────────────────────────────────────

def test_interpret_strategy_accepts_validated_strategy_and_returns_signals():
    """Tracer bullet: interpreter accepts ValidatedStrategy and returns correct shape."""
    candles = make_descending_candles()
    strategy = make_validated_strategy(
        blocks=[
            make_block_dict("rsi-1", "rsi", {"period": 14}),
            make_block_dict("const-1", "constant", {"value": 20}),
            make_block_dict("cmp-1", "compare", {"operator": "<"}),
            make_block_dict("entry-1", "entry_signal"),
        ],
        connections=[
            make_connection_dict("rsi-1", "output", "cmp-1", "left"),
            make_connection_dict("const-1", "output", "cmp-1", "right"),
            make_connection_dict("cmp-1", "output", "entry-1", "signal"),
        ],
    )

    signals = interpret_strategy(strategy, candles)

    assert isinstance(signals.entry_long, list)
    assert len(signals.entry_long) == len(candles)
    assert any(signals.entry_long)


# ── risk params from ValidatedStrategy ───────────────────────────────────────

def test_risk_params_read_from_validated_strategy():
    """Interpreter reads risk params from ValidatedStrategy, not by scanning blocks."""
    candles = make_descending_candles()
    risk = RiskParams(
        position_size_pct=50.0,
        stop_loss_pct=3.0,
        max_drawdown_pct=10.0,
        time_exit_bars=5,
        trailing_stop_pct=2.0,
    )
    strategy = make_validated_strategy(
        blocks=[make_block_dict("entry-1", "entry_signal")],
        risk_params=risk,
    )

    signals = interpret_strategy(strategy, candles)

    assert signals.position_size_pct == 50.0
    assert signals.stop_loss_pct == 3.0
    assert signals.max_drawdown_pct == 10.0
    assert signals.time_exit_bars == 5
    assert signals.trailing_stop_pct == 2.0


def test_take_profit_levels_read_from_validated_strategy():
    """Take-profit levels from RiskParams propagate to StrategySignals."""
    candles = make_descending_candles()
    levels = (
        TakeProfitLevel(profit_pct=5.0, close_pct=50),
        TakeProfitLevel(profit_pct=10.0, close_pct=50),
    )
    strategy = make_validated_strategy(
        blocks=[make_block_dict("entry-1", "entry_signal")],
        risk_params=RiskParams(take_profit_levels=levels),
    )

    signals = interpret_strategy(strategy, candles)

    assert signals.take_profit_levels == list(levels)


def test_absent_risk_blocks_return_baseline_values():
    """RiskParams() defaults propagate: 100% size, all optional fields None."""
    candles = make_descending_candles()
    strategy = make_validated_strategy(
        blocks=[make_block_dict("entry-1", "entry_signal")],
    )

    signals = interpret_strategy(strategy, candles)

    assert signals.position_size_pct == 100.0
    assert signals.take_profit_levels is None
    assert signals.stop_loss_pct is None
    assert signals.max_drawdown_pct is None
    assert signals.time_exit_bars is None
    assert signals.trailing_stop_pct is None


# ── empty-graph guard ─────────────────────────────────────────────────────────

def test_empty_blocks_raises_strategy_invalid_error():
    """Empty-graph guard is retained: no blocks → StrategyInvalidError."""
    from app.backtest.errors import StrategyInvalidError

    strategy = make_validated_strategy(blocks=[])

    with pytest.raises(StrategyInvalidError):
        interpret_strategy(strategy, make_descending_candles())


# ── legacy port-name compare tests (retained) ─────────────────────────────────

def test_compare_supports_a_b_ports_for_entry_signal():
    """a/b port names on the compare block are valid input ports."""
    candles = make_descending_candles()
    strategy = make_validated_strategy(
        blocks=[
            make_block_dict("rsi-1", "rsi", {"period": 14}),
            make_block_dict("const-1", "constant", {"value": 20}),
            make_block_dict("cmp-1", "compare", {"operator": "<"}),
            make_block_dict("entry-1", "entry_signal"),
        ],
        connections=[
            make_connection_dict("rsi-1", "output", "cmp-1", "a"),
            make_connection_dict("const-1", "output", "cmp-1", "b"),
            make_connection_dict("cmp-1", "output", "entry-1", "signal"),
        ],
    )

    signals = interpret_strategy(strategy, candles)

    assert any(signals.entry_long)


def test_compare_supports_left_right_ports_for_entry_signal():
    """left/right port names on the compare block are valid input ports."""
    candles = make_descending_candles()
    strategy = make_validated_strategy(
        blocks=[
            make_block_dict("rsi-1", "rsi", {"period": 14}),
            make_block_dict("const-1", "constant", {"value": 20}),
            make_block_dict("cmp-1", "compare", {"operator": "<"}),
            make_block_dict("entry-1", "entry_signal"),
        ],
        connections=[
            make_connection_dict("rsi-1", "output", "cmp-1", "left"),
            make_connection_dict("const-1", "output", "cmp-1", "right"),
            make_connection_dict("cmp-1", "output", "entry-1", "signal"),
        ],
    )

    signals = interpret_strategy(strategy, candles)

    assert any(signals.entry_long)


def test_compare_supports_legacy_word_operator_below_for_entry_signal():
    """Word operator 'below' is equivalent to '<' in compare block."""
    candles = make_descending_candles()
    strategy = make_validated_strategy(
        blocks=[
            make_block_dict("rsi-1", "rsi", {"period": 14}),
            make_block_dict("const-1", "constant", {"value": 20}),
            make_block_dict("cmp-1", "compare", {"operator": "below"}),
            make_block_dict("entry-1", "entry_signal"),
        ],
        connections=[
            make_connection_dict("rsi-1", "output", "cmp-1", "left"),
            make_connection_dict("const-1", "output", "cmp-1", "right"),
            make_connection_dict("cmp-1", "output", "entry-1", "signal"),
        ],
    )

    signals = interpret_strategy(strategy, candles)

    assert any(signals.entry_long)


def test_macd_signal_port_produces_entry_via_registry():
    """MACD block exposes 'signal' port that can wire into compare."""
    candles = make_uptrend_candles(60)
    strategy = make_validated_strategy(
        blocks=[
            make_block_dict("macd-1", "macd", {"fast_period": 12, "slow_period": 26, "signal_period": 9}),
            make_block_dict("const-1", "constant", {"value": 0}),
            make_block_dict("cmp-1", "compare", {"operator": ">"}),
            make_block_dict("entry-1", "entry_signal"),
        ],
        connections=[
            make_connection_dict("macd-1", "signal", "cmp-1", "left"),
            make_connection_dict("const-1", "output", "cmp-1", "right"),
            make_connection_dict("cmp-1", "output", "entry-1", "signal"),
        ],
    )

    signals = interpret_strategy(strategy, candles)

    assert isinstance(signals.entry_long, list)
    assert len(signals.entry_long) == len(candles)


def test_bollinger_lower_port_triggers_entry_on_price_below_band():
    """Bollinger block exposes 'lower' port; price below lower band triggers entry."""
    candles = make_descending_candles(60)
    strategy = make_validated_strategy(
        blocks=[
            make_block_dict("price-1", "price", {"source": "close"}),
            make_block_dict("boll-1", "bollinger", {"period": 20, "stddev": 2.0}),
            make_block_dict("cmp-1", "compare", {"operator": "<"}),
            make_block_dict("entry-1", "entry_signal"),
        ],
        connections=[
            make_connection_dict("price-1", "output", "cmp-1", "left"),
            make_connection_dict("boll-1", "lower", "cmp-1", "right"),
            make_connection_dict("cmp-1", "output", "entry-1", "signal"),
        ],
    )

    signals = interpret_strategy(strategy, candles)

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
    strategy = make_validated_strategy(
        blocks=[
            make_block_dict("price-1", "price", {"source": "close"}),
            make_block_dict(f"{indicator_type}-1", indicator_type, params),
            make_block_dict("const-1", "constant", {"value": threshold}),
            make_block_dict("cmp-1", "compare", {"operator": operator}),
            make_block_dict("entry-1", "entry_signal"),
        ],
        connections=[
            make_connection_dict(f"{indicator_type}-1", port, "cmp-1", "left"),
            make_connection_dict("const-1", "output", "cmp-1", "right"),
            make_connection_dict("cmp-1", "output", "entry-1", "signal"),
        ],
    )

    signals = interpret_strategy(strategy, candles)

    assert isinstance(signals.entry_long, list)
    assert len(signals.entry_long) == n
    assert isinstance(signals.exit_long, list)
    assert len(signals.exit_long) == n
    assert signals.position_size_pct == 100.0
    assert signals.stop_loss_pct is None
    assert signals.take_profit_levels is None
