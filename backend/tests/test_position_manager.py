"""Tests for position_manager module — symbols defined there and re-exported via engine."""
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_candle(
    high: float,
    low: float,
    close: float,
    open_: float = 100.0,
    timestamp: datetime | None = None,
) -> MagicMock:
    """Build a minimal candle-like object for isolated unit tests."""
    c = MagicMock()
    c.high = high
    c.low = low
    c.close = close
    c.open = open_
    c.timestamp = timestamp or datetime(2024, 1, 2, tzinfo=timezone.utc)
    return c


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


# ===========================================================================
# RiskConfig — new value type
# ===========================================================================

def test_risk_config_exported():
    from app.backtest.position_manager import RiskConfig  # noqa: F401


def test_risk_config_is_frozen():
    from app.backtest.position_manager import RiskConfig

    rc = RiskConfig(
        take_profit_levels=None,
        stop_loss_pct=5.0,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    with pytest.raises((AttributeError, TypeError)):
        rc.stop_loss_pct = 10.0  # type: ignore[misc]


# ===========================================================================
# CandleExit — new value type in exit_conditions
# ===========================================================================

def test_candle_exit_exported():
    from app.backtest.exit_conditions import CandleExit  # noqa: F401


def test_candle_exit_no_full_and_no_partials():
    from app.backtest.exit_conditions import CandleExit

    result = CandleExit(full=None, partials=[])
    assert result.full is None
    assert result.partials == []


def test_candle_exit_full_with_no_partials():
    from app.backtest.exit_conditions import CandleExit, ExitDecision

    dec = ExitDecision(exit_price_raw=95.0, reason="sl")
    result = CandleExit(full=dec, partials=[])
    assert result.full is dec
    assert result.partials == []


# ===========================================================================
# PositionManager — construction
# ===========================================================================

def test_position_manager_exported():
    from app.backtest.position_manager import PositionManager  # noqa: F401


def test_position_manager_starts_closed():
    from app.backtest.position_manager import PositionManager

    pm = PositionManager(fee_rate=0.001, slippage_rate=0.001, spread_rate=0.0002)
    assert pm.is_open is False


def test_position_manager_position_size_zero_when_closed():
    from app.backtest.position_manager import PositionManager

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    assert pm.position_size == 0.0


# ===========================================================================
# PositionManager.enter() — initialisation
# ===========================================================================

def test_enter_sets_is_open():
    from app.backtest.position_manager import PositionManager, RiskConfig

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(
        take_profit_levels=None,
        stop_loss_pct=None,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    pm.enter(
        price=100.0,
        qty=1.0,
        timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc),
        index=1,
        risk=risk,
    )
    assert pm.is_open is True


def test_enter_stores_position_size():
    from app.backtest.position_manager import PositionManager, RiskConfig

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(
        take_profit_levels=None,
        stop_loss_pct=None,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    pm.enter(
        price=100.0,
        qty=2.5,
        timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc),
        index=1,
        risk=risk,
    )
    assert pm.position_size == 2.5


def test_enter_builds_sl_price():
    from app.backtest.position_manager import PositionManager, RiskConfig

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(
        take_profit_levels=None,
        stop_loss_pct=10.0,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    pm.enter(
        price=100.0,
        qty=1.0,
        timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc),
        index=1,
        risk=risk,
    )
    # SL price = entry * (1 - stop_loss_pct / 100)
    assert pm._sl_price == pytest.approx(90.0)


def test_enter_builds_tp_levels_from_risk_config():
    from app.backtest.position_manager import PositionManager, RiskConfig
    from app.backtest.types import TakeProfitLevel

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(
        take_profit_levels=[TakeProfitLevel(profit_pct=5.0, close_pct=50)],
        stop_loss_pct=None,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    pm.enter(
        price=100.0,
        qty=1.0,
        timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc),
        index=1,
        risk=risk,
    )
    assert len(pm._tp_levels) == 1
    assert pm._tp_levels[0].price == pytest.approx(105.0)
    assert pm._tp_levels[0].triggered is False


def test_enter_resets_prior_position_state():
    """Calling enter() a second time must reset all stale state from the first trade."""
    from app.backtest.position_manager import PositionManager, RiskConfig
    from app.backtest.types import TakeProfitLevel

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk1 = RiskConfig(
        take_profit_levels=[TakeProfitLevel(profit_pct=5.0, close_pct=100)],
        stop_loss_pct=10.0,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    pm.enter(price=100.0, qty=1.0, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), index=1, risk=risk1)

    risk2 = RiskConfig(
        take_profit_levels=None,
        stop_loss_pct=None,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    pm.enter(price=200.0, qty=0.5, timestamp=datetime(2024, 1, 2, tzinfo=timezone.utc), index=5, risk=risk2)

    assert pm.position_size == pytest.approx(0.5)
    assert pm._sl_price is None
    assert pm._tp_levels == []


# ===========================================================================
# PositionManager.update_excursions()
# ===========================================================================

def test_update_excursions_tracks_peak_high():
    from app.backtest.position_manager import PositionManager, RiskConfig

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(take_profit_levels=None, stop_loss_pct=None, max_drawdown_pct=None, time_exit_bars=None, trailing_stop_pct=None)
    pm.enter(price=100.0, qty=1.0, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), index=1, risk=risk)

    candle = _make_candle(high=120.0, low=95.0, close=110.0)
    pm.update_excursions(candle)

    assert pm._peak_high == 120.0
    assert pm._peak_high_ts == candle.timestamp


def test_update_excursions_tracks_trough_low():
    from app.backtest.position_manager import PositionManager, RiskConfig

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(take_profit_levels=None, stop_loss_pct=None, max_drawdown_pct=None, time_exit_bars=None, trailing_stop_pct=None)
    pm.enter(price=100.0, qty=1.0, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), index=1, risk=risk)

    candle = _make_candle(high=105.0, low=88.0, close=102.0)
    pm.update_excursions(candle)

    assert pm._trough_low == 88.0
    assert pm._trough_low_ts == candle.timestamp


def test_update_excursions_increments_bars_in_trade():
    from app.backtest.position_manager import PositionManager, RiskConfig

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(take_profit_levels=None, stop_loss_pct=None, max_drawdown_pct=None, time_exit_bars=None, trailing_stop_pct=None)
    pm.enter(price=100.0, qty=1.0, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), index=1, risk=risk)

    pm.update_excursions(_make_candle(high=101.0, low=99.0, close=100.5))
    pm.update_excursions(_make_candle(high=102.0, low=98.0, close=101.0))

    assert pm._bars_in_trade == 2


# ===========================================================================
# PositionManager.check_exits() — same-candle guard
# ===========================================================================

def test_check_exits_same_candle_returns_empty():
    """check_exits on the entry candle must return no-op CandleExit."""
    from app.backtest.position_manager import PositionManager, RiskConfig
    from app.backtest.exit_conditions import CandleExit

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(take_profit_levels=None, stop_loss_pct=10.0, max_drawdown_pct=None, time_exit_bars=None, trailing_stop_pct=None)
    pm.enter(price=100.0, qty=1.0, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), index=3, risk=risk)

    # Candle whose low is below SL — but same-candle guard fires first
    candle = _make_candle(high=100.0, low=80.0, close=85.0)
    result = pm.check_exits(candle, index=3)

    assert isinstance(result, CandleExit)
    assert result.full is None
    assert result.partials == []


# ===========================================================================
# PositionManager.check_exits() — full exits
# ===========================================================================

def test_check_exits_stop_loss_fires():
    from app.backtest.position_manager import PositionManager, RiskConfig
    from app.backtest.exit_conditions import CandleExit

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    # SL at 10% → sl_price = 90.0
    risk = RiskConfig(take_profit_levels=None, stop_loss_pct=10.0, max_drawdown_pct=None, time_exit_bars=None, trailing_stop_pct=None)
    pm.enter(price=100.0, qty=1.0, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), index=1, risk=risk)

    # Next candle (index=2) — low dips below SL
    candle = _make_candle(high=100.0, low=85.0, close=88.0)
    pm.update_excursions(candle)
    result = pm.check_exits(candle, index=2)

    assert isinstance(result, CandleExit)
    assert result.full is not None
    assert result.full.reason == "sl"
    assert result.full.exit_price_raw == pytest.approx(90.0)
    assert result.partials == []


def test_check_exits_full_exit_preempts_tp():
    """When SL fires on the same candle as a TP level, the full exit wins."""
    from app.backtest.position_manager import PositionManager, RiskConfig
    from app.backtest.exit_conditions import CandleExit
    from app.backtest.types import TakeProfitLevel

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(
        take_profit_levels=[TakeProfitLevel(profit_pct=5.0, close_pct=50)],
        stop_loss_pct=10.0,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    pm.enter(price=100.0, qty=1.0, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), index=1, risk=risk)

    # Candle: high touches TP (105.0) AND low breaches SL (90.0)
    candle = _make_candle(high=106.0, low=85.0, close=88.0)
    pm.update_excursions(candle)
    result = pm.check_exits(candle, index=2)

    assert result.full is not None
    assert result.full.reason == "sl"
    assert result.partials == []  # invariant: full is not None => partials == []


def test_check_exits_time_exit_fires():
    from app.backtest.position_manager import PositionManager, RiskConfig

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(take_profit_levels=None, stop_loss_pct=None, max_drawdown_pct=None, time_exit_bars=3, trailing_stop_pct=None)
    pm.enter(price=100.0, qty=1.0, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), index=0, risk=risk)

    ts = datetime(2024, 1, 2, tzinfo=timezone.utc)
    candle = _make_candle(high=102.0, low=98.0, close=100.5, timestamp=ts)
    # Simulate 3 bars
    for _ in range(3):
        pm.update_excursions(candle)

    result = pm.check_exits(candle, index=4)
    assert result.full is not None
    assert result.full.reason == "time_exit"


# ===========================================================================
# PositionManager.check_exits() — TP ladder partials
# ===========================================================================

def test_check_exits_tp_partial_returned():
    from app.backtest.position_manager import PositionManager, RiskConfig
    from app.backtest.types import TakeProfitLevel

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(
        take_profit_levels=[TakeProfitLevel(profit_pct=5.0, close_pct=50)],
        stop_loss_pct=None,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    pm.enter(price=100.0, qty=2.0, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), index=1, risk=risk)

    # Candle hits TP level (high >= 105.0) with no full-exit condition
    candle = _make_candle(high=106.0, low=100.0, close=104.0)
    pm.update_excursions(candle)
    result = pm.check_exits(candle, index=2)

    assert result.full is None
    assert len(result.partials) == 1
    partial = result.partials[0]
    assert partial.exit_price_raw == pytest.approx(105.0)
    assert partial.qty == pytest.approx(1.0)  # 50% of 2.0


def test_check_exits_multi_level_tp_ladder():
    from app.backtest.position_manager import PositionManager, RiskConfig
    from app.backtest.types import TakeProfitLevel

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(
        take_profit_levels=[
            TakeProfitLevel(profit_pct=5.0, close_pct=50),
            TakeProfitLevel(profit_pct=10.0, close_pct=50),
        ],
        stop_loss_pct=None,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    pm.enter(price=100.0, qty=2.0, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), index=1, risk=risk)

    # Candle hits both TP levels (high >= 110.0)
    candle = _make_candle(high=115.0, low=100.0, close=112.0)
    pm.update_excursions(candle)
    result = pm.check_exits(candle, index=2)

    assert result.full is None
    assert len(result.partials) == 2


# ===========================================================================
# PositionManager.apply_partial()
# ===========================================================================

def test_apply_partial_returns_trade():
    from app.backtest.position_manager import PositionManager, RiskConfig
    from app.backtest.exit_conditions import PartialExit
    from app.backtest.types import TakeProfitLevel

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(
        take_profit_levels=[TakeProfitLevel(profit_pct=5.0, close_pct=50)],
        stop_loss_pct=None,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
    pm.enter(price=100.0, qty=2.0, timestamp=ts, index=1, risk=risk)

    candle = _make_candle(high=110.0, low=100.0, close=108.0)
    pm.update_excursions(candle)
    result = pm.check_exits(candle, index=2)
    partial = result.partials[0]

    trade = pm.apply_partial(partial, timestamp=candle.timestamp)

    from app.backtest.position_manager import Trade
    assert isinstance(trade, Trade)
    assert trade.exit_reason == "tp"
    assert trade.qty == pytest.approx(1.0)


def test_apply_partial_decrements_position_size():
    from app.backtest.position_manager import PositionManager, RiskConfig
    from app.backtest.types import TakeProfitLevel

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(
        take_profit_levels=[TakeProfitLevel(profit_pct=5.0, close_pct=50)],
        stop_loss_pct=None,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
    pm.enter(price=100.0, qty=2.0, timestamp=ts, index=1, risk=risk)

    candle = _make_candle(high=110.0, low=100.0, close=108.0)
    pm.update_excursions(candle)
    result = pm.check_exits(candle, index=2)
    pm.apply_partial(result.partials[0], timestamp=candle.timestamp)

    assert pm.position_size == pytest.approx(1.0)
    assert pm.is_open is True  # still open


def test_apply_partial_closes_position_when_size_exhausted():
    """A 100%-close TP level should leave is_open=False after apply_partial."""
    from app.backtest.position_manager import PositionManager, RiskConfig
    from app.backtest.types import TakeProfitLevel

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(
        take_profit_levels=[TakeProfitLevel(profit_pct=5.0, close_pct=100)],
        stop_loss_pct=None,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
    pm.enter(price=100.0, qty=1.0, timestamp=ts, index=1, risk=risk)

    candle = _make_candle(high=110.0, low=100.0, close=108.0)
    pm.update_excursions(candle)
    result = pm.check_exits(candle, index=2)
    pm.apply_partial(result.partials[0], timestamp=candle.timestamp)

    assert pm.is_open is False
    assert pm.position_size == 0.0


def test_apply_partial_marks_tp_level_triggered():
    from app.backtest.position_manager import PositionManager, RiskConfig
    from app.backtest.types import TakeProfitLevel

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(
        take_profit_levels=[TakeProfitLevel(profit_pct=5.0, close_pct=50)],
        stop_loss_pct=None,
        max_drawdown_pct=None,
        time_exit_bars=None,
        trailing_stop_pct=None,
    )
    ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
    pm.enter(price=100.0, qty=2.0, timestamp=ts, index=1, risk=risk)

    candle = _make_candle(high=110.0, low=100.0, close=108.0)
    pm.update_excursions(candle)
    result = pm.check_exits(candle, index=2)
    partial = result.partials[0]
    pm.apply_partial(partial, timestamp=candle.timestamp)

    assert pm._tp_levels[partial.level_index].triggered is True


# ===========================================================================
# PositionManager.close()
# ===========================================================================

def test_close_returns_trade():
    from app.backtest.position_manager import PositionManager, RiskConfig, Trade

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(take_profit_levels=None, stop_loss_pct=None, max_drawdown_pct=None, time_exit_bars=None, trailing_stop_pct=None)
    ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
    pm.enter(price=100.0, qty=1.0, timestamp=ts, index=1, risk=risk)

    exit_ts = datetime(2024, 1, 5, tzinfo=timezone.utc)
    trade = pm.close(price=110.0, reason="end_of_data", timestamp=exit_ts)

    assert isinstance(trade, Trade)
    assert trade.exit_reason == "end_of_data"
    assert trade.qty == pytest.approx(1.0)


def test_close_resets_position():
    from app.backtest.position_manager import PositionManager, RiskConfig

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(take_profit_levels=None, stop_loss_pct=None, max_drawdown_pct=None, time_exit_bars=None, trailing_stop_pct=None)
    ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
    pm.enter(price=100.0, qty=1.0, timestamp=ts, index=1, risk=risk)

    pm.close(price=110.0, reason="signal", timestamp=datetime(2024, 1, 5, tzinfo=timezone.utc))

    assert pm.is_open is False
    assert pm.position_size == 0.0


# ===========================================================================
# PositionManager.unrealized_pnl()
# ===========================================================================

def test_unrealized_pnl_computes_correctly():
    from app.backtest.position_manager import PositionManager, RiskConfig

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(take_profit_levels=None, stop_loss_pct=None, max_drawdown_pct=None, time_exit_bars=None, trailing_stop_pct=None)
    pm.enter(price=100.0, qty=2.0, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), index=1, risk=risk)

    # (110 - 100) * 2.0 = 20.0
    assert pm.unrealized_pnl(close_price=110.0) == pytest.approx(20.0)


def test_unrealized_pnl_negative_when_price_below_entry():
    from app.backtest.position_manager import PositionManager, RiskConfig

    pm = PositionManager(fee_rate=0.0, slippage_rate=0.0, spread_rate=0.0)
    risk = RiskConfig(take_profit_levels=None, stop_loss_pct=None, max_drawdown_pct=None, time_exit_bars=None, trailing_stop_pct=None)
    pm.enter(price=100.0, qty=1.0, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc), index=1, risk=risk)

    # (90 - 100) * 1.0 = -10.0
    assert pm.unrealized_pnl(close_price=90.0) == pytest.approx(-10.0)


# ===========================================================================
# Docstring exception to immutability rule
# ===========================================================================

def test_position_manager_docstring_mentions_mutable_exception():
    from app.backtest.position_manager import PositionManager

    assert PositionManager.__doc__ is not None
    doc = PositionManager.__doc__.lower()
    assert "mutable" in doc or "exception" in doc
