"""Pure unit tests for the Backtest trades artifact module — no S3, Redis, DB, or FastAPI."""
from datetime import datetime, timezone

import pytest

from app.backtest.position_manager import Trade
from app.backtest.trades_artifact import dump_trades, load_trades

_ENTRY_TIME = datetime(2024, 1, 10, 12, 0, 0, tzinfo=timezone.utc)
_EXIT_TIME = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
_PEAK_TIME = datetime(2024, 1, 14, 12, 0, 0, tzinfo=timezone.utc)
_TROUGH_TIME = datetime(2024, 1, 11, 12, 0, 0, tzinfo=timezone.utc)


def _make_trade(**kwargs) -> Trade:
    defaults = dict(
        entry_time=_ENTRY_TIME,
        entry_price=100.0,
        exit_time=_EXIT_TIME,
        exit_price=110.0,
        side="long",
        pnl=100.0,
        pnl_pct=10.0,
        qty=1.0,
        sl_price_at_entry=90.0,
        tp_price_at_entry=115.0,
        exit_reason="tp",
        mae_usd=50.0,
        mae_pct=0.5,
        mfe_usd=150.0,
        mfe_pct=1.5,
        initial_risk_usd=100.0,
        r_multiple=1.0,
        peak_price=112.0,
        peak_ts=_PEAK_TIME,
        trough_price=98.0,
        trough_ts=_TROUGH_TIME,
        duration_seconds=432000,
        fee_cost_usd=0.5,
        slippage_cost_usd=0.3,
        spread_cost_usd=0.2,
        total_cost_usd=1.0,
        notional_usd=100.0,
    )
    defaults.update(kwargs)
    return Trade(**defaults)


def _minimal_stored_dict() -> dict:
    """Wire-format dict matching today's exact serialized shape."""
    return {
        "entry_time": _ENTRY_TIME.isoformat(),
        "entry_price": 100.0,
        "exit_time": _EXIT_TIME.isoformat(),
        "exit_price": 110.0,
        "side": "long",
        "pnl": 100.0,
        "pnl_pct": 10.0,
        "qty": 1.0,
        "sl_price_at_entry": 90.0,
        "tp_price_at_entry": 115.0,
        "exit_reason": "tp",
        "mae_usd": 50.0,
        "mae_pct": 0.5,
        "mfe_usd": 150.0,
        "mfe_pct": 1.5,
        "initial_risk_usd": 100.0,
        "r_multiple": 1.0,
        "peak_price": 112.0,
        "peak_ts": _PEAK_TIME.isoformat(),
        "trough_price": 98.0,
        "trough_ts": _TROUGH_TIME.isoformat(),
        "duration_seconds": 432000,
        "fee_cost_usd": 0.5,
        "slippage_cost_usd": 0.3,
        "spread_cost_usd": 0.2,
        "total_cost_usd": 1.0,
        "notional_usd": 100.0,
    }


class TestRoundTrip:
    def test_trade_dumps_and_loads_to_expected_trade_detail(self):
        trade = _make_trade()
        [detail] = load_trades(dump_trades([trade]))
        assert detail.entry_time == _ENTRY_TIME
        assert detail.exit_time == _EXIT_TIME
        assert detail.entry_price == 100.0
        assert detail.exit_price == 110.0
        assert detail.side == "long"
        assert detail.pnl == 100.0
        assert detail.pnl_pct == 10.0
        assert detail.qty == 1.0
        assert detail.exit_reason == "tp"
        assert detail.mae_usd == 50.0
        assert detail.mfe_usd == 150.0
        assert detail.peak_price == 112.0
        assert detail.peak_ts == _PEAK_TIME
        assert detail.trough_price == 98.0
        assert detail.trough_ts == _TROUGH_TIME
        assert detail.duration_seconds == 432000
        assert detail.fee_cost_usd == 0.5
        assert detail.total_cost_usd == 1.0

    def test_optional_fields_preserved_through_round_trip(self):
        trade = _make_trade(
            sl_price_at_entry=90.0,
            tp_price_at_entry=115.0,
            initial_risk_usd=100.0,
            r_multiple=1.0,
        )
        [detail] = load_trades(dump_trades([trade]))
        assert detail.sl_price_at_entry == 90.0
        assert detail.tp_price_at_entry == 115.0
        assert detail.initial_risk_usd == 100.0
        assert detail.r_multiple == 1.0

    def test_multiple_trades_round_trip(self):
        trades = [_make_trade(pnl_pct=10.0), _make_trade(pnl_pct=-5.0)]
        details = load_trades(dump_trades(trades))
        assert len(details) == 2
        assert details[0].pnl_pct == 10.0
        assert details[1].pnl_pct == -5.0


class TestBackwardCompatibility:
    def test_missing_pnl_pct_is_recomputed_for_long_trade(self):
        stored = _minimal_stored_dict()
        del stored["pnl_pct"]
        [detail] = load_trades([stored])
        assert detail.pnl_pct == pytest.approx(((110.0 - 100.0) / 100.0) * 100)

    def test_missing_pnl_pct_is_never_silently_zero(self):
        """Regression: the old status-response path silently returned 0%."""
        stored = _minimal_stored_dict()
        del stored["pnl_pct"]
        [detail] = load_trades([stored])
        assert detail.pnl_pct != 0.0

    def test_missing_pnl_pct_for_short_trade_is_recomputed(self):
        stored = _minimal_stored_dict()
        stored["side"] = "short"
        del stored["pnl_pct"]
        [detail] = load_trades([stored])
        assert detail.pnl_pct == pytest.approx(((100.0 - 110.0) / 100.0) * 100)

    def test_missing_peak_ts_defaults_to_entry_time(self):
        stored = _minimal_stored_dict()
        del stored["peak_ts"]
        [detail] = load_trades([stored])
        assert detail.peak_ts == _ENTRY_TIME

    def test_missing_trough_ts_defaults_to_entry_time(self):
        stored = _minimal_stored_dict()
        del stored["trough_ts"]
        [detail] = load_trades([stored])
        assert detail.trough_ts == _ENTRY_TIME

    def test_missing_cost_fields_default_to_none(self):
        stored = _minimal_stored_dict()
        for field in ("fee_cost_usd", "slippage_cost_usd", "spread_cost_usd", "total_cost_usd", "notional_usd"):
            del stored[field]
        [detail] = load_trades([stored])
        assert detail.fee_cost_usd is None
        assert detail.slippage_cost_usd is None
        assert detail.spread_cost_usd is None
        assert detail.total_cost_usd is None
        assert detail.notional_usd is None

    def test_missing_excursion_fields_default_to_zero(self):
        stored = _minimal_stored_dict()
        for field in ("mae_usd", "mae_pct", "mfe_usd", "mfe_pct"):
            del stored[field]
        [detail] = load_trades([stored])
        assert detail.mae_usd == 0.0
        assert detail.mae_pct == 0.0
        assert detail.mfe_usd == 0.0
        assert detail.mfe_pct == 0.0


class TestMalformedRecord:
    def test_missing_entry_time_raises_value_error(self):
        stored = _minimal_stored_dict()
        del stored["entry_time"]
        with pytest.raises(ValueError):
            load_trades([stored])

    def test_missing_exit_time_raises_value_error(self):
        stored = _minimal_stored_dict()
        del stored["exit_time"]
        with pytest.raises(ValueError):
            load_trades([stored])

    def test_empty_list_returns_empty(self):
        assert load_trades([]) == []


class TestCharacterizationPin:
    def test_dump_produces_exact_27_key_shape(self):
        [row] = dump_trades([_make_trade()])
        expected_keys = {
            "entry_time", "entry_price", "exit_time", "exit_price", "side",
            "pnl", "pnl_pct", "qty", "sl_price_at_entry", "tp_price_at_entry",
            "exit_reason", "mae_usd", "mae_pct", "mfe_usd", "mfe_pct",
            "initial_risk_usd", "r_multiple", "peak_price", "peak_ts",
            "trough_price", "trough_ts", "duration_seconds", "fee_cost_usd",
            "slippage_cost_usd", "spread_cost_usd", "total_cost_usd", "notional_usd",
        }
        assert set(row.keys()) == expected_keys

    def test_dump_serializes_timestamps_as_iso_strings(self):
        [row] = dump_trades([_make_trade()])
        assert row["entry_time"] == _ENTRY_TIME.isoformat()
        assert row["exit_time"] == _EXIT_TIME.isoformat()
        assert row["peak_ts"] == _PEAK_TIME.isoformat()
        assert row["trough_ts"] == _TROUGH_TIME.isoformat()

    def test_dump_uses_entry_time_as_fallback_for_none_peak_ts(self):
        [row] = dump_trades([_make_trade(peak_ts=None)])
        assert row["peak_ts"] == _ENTRY_TIME.isoformat()

    def test_dump_uses_entry_time_as_fallback_for_none_trough_ts(self):
        [row] = dump_trades([_make_trade(trough_ts=None)])
        assert row["trough_ts"] == _ENTRY_TIME.isoformat()

    def test_dump_output_matches_expected_wire_dict(self):
        [row] = dump_trades([_make_trade()])
        assert row == _minimal_stored_dict()
