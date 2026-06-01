"""Tests for position_manager module — symbols defined there and re-exported via engine."""
from datetime import datetime, timezone

import pytest


# --- Tracer bullet: new module must export the moved symbols ---

def test_position_manager_exports_trade():
    from app.backtest.position_manager import Trade  # noqa: F401


def test_position_manager_exports_tp_level_state():
    from app.backtest.position_manager import TPLevelState  # noqa: F401


def test_position_manager_exports_create_trade():
    from app.backtest.position_manager import _create_trade  # noqa: F401


# --- Backward-compat: all three symbols remain importable from engine ---

def test_engine_still_exports_trade():
    from app.backtest.engine import Trade  # noqa: F401


def test_engine_still_exports_tp_level_state():
    from app.backtest.engine import TPLevelState  # noqa: F401


def test_engine_still_exports_create_trade():
    from app.backtest.engine import _create_trade  # noqa: F401


# --- Behavioral: _create_trade produces correct Trade values ---

def test_create_trade_produces_correct_pnl():
    from app.backtest.position_manager import Trade, TPLevelState, _create_trade

    entry = datetime(2024, 1, 1, tzinfo=timezone.utc)
    exit_ = datetime(2024, 1, 2, tzinfo=timezone.utc)

    trade, pnl = _create_trade(
        qty=1.0,
        exit_price_raw=110.0,
        exit_reason="sl",
        entry_price=100.0,
        entry_time=entry,
        exit_timestamp=exit_,
        sl_price=95.0,
        tp_levels=[],
        peak_high=115.0,
        peak_high_ts=exit_,
        trough_low=90.0,
        trough_low_ts=entry,
        slippage_rate=0.0,
        fee_rate=0.0,
        spread_rate=0.0,
    )

    assert isinstance(trade, Trade)
    assert trade.exit_reason == "sl"
    assert trade.side == "long"
    assert round(pnl, 4) == 10.0


def test_create_trade_uses_tp_levels_for_tp_price_record():
    from app.backtest.position_manager import TPLevelState, _create_trade

    entry = datetime(2024, 1, 1, tzinfo=timezone.utc)
    exit_ = datetime(2024, 1, 2, tzinfo=timezone.utc)

    lvl = TPLevelState(profit_pct=5.0, close_pct=50, price=105.0)
    trade, _ = _create_trade(
        qty=1.0,
        exit_price_raw=105.0,
        exit_reason="tp",
        entry_price=100.0,
        entry_time=entry,
        exit_timestamp=exit_,
        sl_price=None,
        tp_levels=[lvl],
        peak_high=105.0,
        peak_high_ts=exit_,
        trough_low=99.0,
        trough_low_ts=entry,
        slippage_rate=0.0,
        fee_rate=0.0,
        spread_rate=0.0,
    )

    assert trade.tp_price_at_entry == 105.0


def test_tp_level_state_defaults_triggered_false():
    from app.backtest.position_manager import TPLevelState

    lvl = TPLevelState(profit_pct=10.0, close_pct=25, price=110.0)
    assert lvl.triggered is False
