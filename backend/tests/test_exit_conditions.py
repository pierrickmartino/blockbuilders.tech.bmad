"""Unit tests for the exit_conditions module.

Each test constructs a hand-built PositionContext directly — no run_backtest
call, no fixtures, no mocks.
"""
from datetime import datetime

import pytest

from app.backtest.engine import TPLevelState
from app.backtest.exit_conditions import (
    EXIT_PRIORITY_SEQUENCE,
    ExitCondition,
    ExitDecision,
    PartialExit,
    PositionContext,
    apply_take_profit_ladder,
    check_exit_signal,
    check_max_drawdown,
    check_stop_loss,
    check_time_exit,
    check_trailing_stop,
)
from app.models.candle import Candle


def _candle(low: float, high: float, close: float) -> Candle:
    return Candle(
        asset="BTC/USDT",
        timeframe="1d",
        timestamp=datetime(2024, 1, 1),
        open=close,
        high=high,
        low=low,
        close=close,
        volume=1000.0,
    )


def _ctx(**kwargs) -> PositionContext:
    defaults = dict(
        candle=_candle(low=90.0, high=110.0, close=100.0),
        entry_price=100.0,
        sl_price=None,
        highest_close_since_entry=100.0,
        bars_in_trade=1,
        tp_levels=[],
        position_size=1.0,
        initial_qty=1.0,
        trailing_stop_threshold=None,
        max_dd_threshold=None,
        time_exit_threshold=None,
        exit_signal=False,
    )
    return PositionContext(**{**defaults, **kwargs})


# ---------------------------------------------------------------------------
# check_stop_loss
# ---------------------------------------------------------------------------

def test_stop_loss_triggers_when_candle_low_hits_sl_price():
    ctx = _ctx(sl_price=95.0, candle=_candle(low=94.0, high=110.0, close=100.0))
    assert check_stop_loss(ctx) == ExitDecision(exit_price_raw=95.0, reason="sl")


def test_stop_loss_triggers_exactly_at_sl_price():
    ctx = _ctx(sl_price=95.0, candle=_candle(low=95.0, high=110.0, close=100.0))
    assert check_stop_loss(ctx) == ExitDecision(exit_price_raw=95.0, reason="sl")


def test_stop_loss_returns_none_when_candle_low_above_sl_price():
    ctx = _ctx(sl_price=95.0, candle=_candle(low=96.0, high=110.0, close=100.0))
    assert check_stop_loss(ctx) is None


def test_stop_loss_returns_none_when_sl_price_is_none():
    ctx = _ctx(sl_price=None, candle=_candle(low=50.0, high=110.0, close=100.0))
    assert check_stop_loss(ctx) is None


# ---------------------------------------------------------------------------
# check_trailing_stop
# ---------------------------------------------------------------------------

def test_trailing_stop_triggers_when_candle_low_hits_trailing_price():
    # highest_close=110, threshold=10% → trailing_stop_price=99.0
    ctx = _ctx(
        highest_close_since_entry=110.0,
        trailing_stop_threshold=10.0,
        candle=_candle(low=98.0, high=120.0, close=100.0),
    )
    assert check_trailing_stop(ctx) == ExitDecision(exit_price_raw=99.0, reason="trailing_stop")


def test_trailing_stop_returns_none_when_candle_low_above_trailing_price():
    # highest_close=110, threshold=10% → trailing_stop_price=99.0, low=100
    ctx = _ctx(
        highest_close_since_entry=110.0,
        trailing_stop_threshold=10.0,
        candle=_candle(low=100.0, high=120.0, close=105.0),
    )
    assert check_trailing_stop(ctx) is None


def test_trailing_stop_returns_none_when_threshold_is_none():
    ctx = _ctx(trailing_stop_threshold=None)
    assert check_trailing_stop(ctx) is None


# ---------------------------------------------------------------------------
# check_max_drawdown
# ---------------------------------------------------------------------------

def test_max_drawdown_triggers_when_drawdown_exceeds_threshold():
    # entry=100, close=85 → drawdown=15%
    ctx = _ctx(
        entry_price=100.0,
        max_dd_threshold=10.0,
        candle=_candle(low=80.0, high=100.0, close=85.0),
    )
    assert check_max_drawdown(ctx) == ExitDecision(exit_price_raw=85.0, reason="max_dd")


def test_max_drawdown_triggers_exactly_at_threshold():
    # entry=100, close=90 → drawdown=10%
    ctx = _ctx(
        entry_price=100.0,
        max_dd_threshold=10.0,
        candle=_candle(low=88.0, high=100.0, close=90.0),
    )
    assert check_max_drawdown(ctx) == ExitDecision(exit_price_raw=90.0, reason="max_dd")


def test_max_drawdown_returns_none_when_drawdown_below_threshold():
    # entry=100, close=95 → drawdown=5%
    ctx = _ctx(
        entry_price=100.0,
        max_dd_threshold=10.0,
        candle=_candle(low=93.0, high=100.0, close=95.0),
    )
    assert check_max_drawdown(ctx) is None


def test_max_drawdown_returns_none_when_threshold_is_none():
    ctx = _ctx(max_dd_threshold=None)
    assert check_max_drawdown(ctx) is None


# ---------------------------------------------------------------------------
# check_time_exit
# ---------------------------------------------------------------------------

def test_time_exit_triggers_when_bars_meets_threshold():
    ctx = _ctx(bars_in_trade=10, time_exit_threshold=10)
    result = check_time_exit(ctx)
    assert result == ExitDecision(exit_price_raw=100.0, reason="time_exit")


def test_time_exit_triggers_when_bars_exceed_threshold():
    ctx = _ctx(bars_in_trade=15, time_exit_threshold=10)
    assert check_time_exit(ctx) == ExitDecision(exit_price_raw=100.0, reason="time_exit")


def test_time_exit_returns_none_when_bars_below_threshold():
    ctx = _ctx(bars_in_trade=9, time_exit_threshold=10)
    assert check_time_exit(ctx) is None


def test_time_exit_returns_none_when_threshold_is_none():
    ctx = _ctx(time_exit_threshold=None)
    assert check_time_exit(ctx) is None


# ---------------------------------------------------------------------------
# check_exit_signal
# ---------------------------------------------------------------------------

def test_exit_signal_triggers_when_signal_is_true():
    ctx = _ctx(exit_signal=True)
    assert check_exit_signal(ctx) == ExitDecision(exit_price_raw=100.0, reason="signal")


def test_exit_signal_returns_none_when_signal_is_false():
    ctx = _ctx(exit_signal=False)
    assert check_exit_signal(ctx) is None


# ---------------------------------------------------------------------------
# apply_take_profit_ladder
# ---------------------------------------------------------------------------

def test_tp_ladder_returns_empty_when_no_levels():
    ctx = _ctx(tp_levels=[])
    assert apply_take_profit_ladder(ctx) == []


def test_tp_ladder_returns_partial_exit_when_level_hit():
    level = TPLevelState(profit_pct=5.0, close_pct=50, price=105.0, triggered=False)
    ctx = _ctx(
        tp_levels=[level],
        initial_qty=1.0,
        position_size=1.0,
        candle=_candle(low=100.0, high=110.0, close=105.0),
    )
    result = apply_take_profit_ladder(ctx)
    assert result == [PartialExit(level_index=0, qty=0.5, exit_price_raw=105.0)]


def test_tp_ladder_returns_empty_when_candle_high_below_level_price():
    level = TPLevelState(profit_pct=10.0, close_pct=50, price=110.0, triggered=False)
    ctx = _ctx(
        tp_levels=[level],
        candle=_candle(low=100.0, high=105.0, close=103.0),
    )
    assert apply_take_profit_ladder(ctx) == []


def test_tp_ladder_skips_already_triggered_levels():
    level = TPLevelState(profit_pct=5.0, close_pct=50, price=105.0, triggered=True)
    ctx = _ctx(
        tp_levels=[level],
        candle=_candle(low=100.0, high=115.0, close=110.0),
    )
    assert apply_take_profit_ladder(ctx) == []


def test_tp_ladder_caps_qty_at_remaining_position_size():
    # level1 wants 75% of initial_qty=1.0 (0.75), level2 wants another 75% but only 0.25 remain
    level1 = TPLevelState(profit_pct=5.0, close_pct=75, price=105.0, triggered=False)
    level2 = TPLevelState(profit_pct=10.0, close_pct=75, price=110.0, triggered=False)
    ctx = _ctx(
        tp_levels=[level1, level2],
        initial_qty=1.0,
        position_size=1.0,
        candle=_candle(low=100.0, high=115.0, close=112.0),
    )
    result = apply_take_profit_ladder(ctx)
    assert len(result) == 2
    assert result[0] == PartialExit(level_index=0, qty=0.75, exit_price_raw=105.0)
    assert result[1] == PartialExit(level_index=1, qty=0.25, exit_price_raw=110.0)


def test_tp_ladder_sorts_levels_by_profit_pct_ascending():
    # Define levels out of order — higher profit first in the list
    level_high = TPLevelState(profit_pct=10.0, close_pct=50, price=110.0, triggered=False)
    level_low = TPLevelState(profit_pct=5.0, close_pct=50, price=105.0, triggered=False)
    ctx = _ctx(
        tp_levels=[level_high, level_low],
        initial_qty=1.0,
        position_size=1.0,
        candle=_candle(low=100.0, high=115.0, close=112.0),
    )
    result = apply_take_profit_ladder(ctx)
    # level_low (5%) should be processed first; level_high (10%) second
    # level_low is at original index 1, level_high at 0
    assert result[0].exit_price_raw == 105.0
    assert result[1].exit_price_raw == 110.0
    assert result[0].level_index == 1   # original index of level_low
    assert result[1].level_index == 0   # original index of level_high


# ---------------------------------------------------------------------------
# EXIT_PRIORITY_SEQUENCE
# ---------------------------------------------------------------------------

def test_exit_priority_sequence_has_five_entries():
    assert len(EXIT_PRIORITY_SEQUENCE) == 5


def test_exit_priority_sequence_order():
    names = [e.name for e in EXIT_PRIORITY_SEQUENCE]
    assert names == ["stop_loss", "trailing_stop", "max_drawdown", "time_exit", "signal"]


def test_exit_priority_sequence_entries_are_exit_conditions():
    for entry in EXIT_PRIORITY_SEQUENCE:
        assert isinstance(entry, ExitCondition)


def test_exit_priority_sequence_checkers_are_callable():
    for entry in EXIT_PRIORITY_SEQUENCE:
        assert callable(entry.check)
