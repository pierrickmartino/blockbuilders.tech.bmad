"""Tests for pure performance-alert decision functions.

Covers: entry fires / no-fire / no-refire / watermark advancement,
exit fires / no-fire / end_of_data exclusion,
drawdown crossing / re-arm / no-refire semantics.
"""
from datetime import datetime, timezone

from app.services.performance_alert_decision import (
    decide_entry_alert,
    decide_exit_alert,
    decide_drawdown_alert,
)


def _ts(day: int) -> str:
    """Return ISO timestamp for 2025-01-{day} 12:00 UTC."""
    return f"2025-01-{day:02d}T12:00:00+00:00"


def _dt(day: int) -> datetime:
    return datetime(2025, 1, day, 12, 0, 0, tzinfo=timezone.utc)


# ── RED→GREEN 1: entry transition fires ─────────────────────────────────────

def test_entry_on_new_candle_fires():
    trades = [{"entry_time": _ts(5)}]
    watermark = _dt(3)
    run_date_to = _dt(5)

    result = decide_entry_alert(trades, watermark, run_date_to)

    assert len(result.fired_events) == 1
    assert result.fired_events[0].entry_time.date() == _dt(5).date()


# ── RED→GREEN 2: no transition → no fire ────────────────────────────────────

def test_no_trades_does_not_fire():
    result = decide_entry_alert([], None, _dt(5))
    assert result.fired_events == []


def test_entry_at_or_before_watermark_does_not_fire():
    trades = [{"entry_time": _ts(3)}]
    watermark = _dt(3)  # same date as entry
    run_date_to = _dt(5)

    result = decide_entry_alert(trades, watermark, run_date_to)

    assert result.fired_events == []


# ── RED→GREEN 3: no re-fire on same candle ───────────────────────────────────

def test_entry_before_watermark_does_not_refire():
    trades = [{"entry_time": _ts(4)}]
    watermark = _dt(5)  # watermark is ahead of the entry
    run_date_to = _dt(6)

    result = decide_entry_alert(trades, watermark, run_date_to)

    assert result.fired_events == []


def test_multiple_entries_only_new_ones_fire():
    trades = [
        {"entry_time": _ts(2)},  # before watermark
        {"entry_time": _ts(4)},  # at watermark — should NOT fire
        {"entry_time": _ts(6)},  # newer — SHOULD fire
    ]
    watermark = _dt(4)
    run_date_to = _dt(6)

    result = decide_entry_alert(trades, watermark, run_date_to)

    assert len(result.fired_events) == 1
    assert result.fired_events[0].entry_time.date() == _dt(6).date()


# ── RED→GREEN 4: watermark advances ─────────────────────────────────────────

def test_watermark_advances_to_run_date_to_when_fired():
    trades = [{"entry_time": _ts(5)}]
    result = decide_entry_alert(trades, None, _dt(5))
    assert result.new_watermark.date() == _dt(5).date()


def test_watermark_advances_to_run_date_to_even_when_no_fire():
    result = decide_entry_alert([], None, _dt(7))
    assert result.new_watermark.date() == _dt(7).date()


# ── Edge: no prior watermark fires any entry ─────────────────────────────────

def test_no_prior_watermark_fires_all_entries():
    trades = [{"entry_time": _ts(1)}, {"entry_time": _ts(3)}]
    result = decide_entry_alert(trades, None, _dt(3))
    assert len(result.fired_events) == 2


# ── Edge: naive timestamps normalised to UTC ─────────────────────────────────

def test_naive_entry_timestamp_is_normalised():
    naive_ts = "2025-01-05T12:00:00"  # no timezone
    result = decide_entry_alert([{"entry_time": naive_ts}], None, _dt(5))
    assert len(result.fired_events) == 1
    assert result.fired_events[0].entry_time.tzinfo is not None


# ════════════════════════════════════════════════════════════════════════════
# decide_exit_alert
# ════════════════════════════════════════════════════════════════════════════

# ── RED→GREEN 1: exit transition fires ──────────────────────────────────────

def test_exit_on_new_candle_fires():
    trades = [{"exit_time": _ts(5), "exit_reason": "signal"}]
    result = decide_exit_alert(trades, _dt(3), _dt(5))
    assert len(result.fired_events) == 1
    assert result.fired_events[0].exit_time.date() == _dt(5).date()


def test_exit_reason_preserved_in_event():
    trades = [{"exit_time": _ts(5), "exit_reason": "tp"}]
    result = decide_exit_alert(trades, _dt(3), _dt(5))
    assert result.fired_events[0].exit_reason == "tp"


# ── RED→GREEN 2: no fire cases ───────────────────────────────────────────────

def test_exit_no_trades_does_not_fire():
    result = decide_exit_alert([], None, _dt(5))
    assert result.fired_events == []


def test_exit_at_or_before_watermark_does_not_fire():
    trades = [{"exit_time": _ts(3), "exit_reason": "signal"}]
    result = decide_exit_alert(trades, _dt(3), _dt(5))
    assert result.fired_events == []


def test_exit_before_watermark_does_not_refire():
    trades = [{"exit_time": _ts(4), "exit_reason": "signal"}]
    result = decide_exit_alert(trades, _dt(5), _dt(6))
    assert result.fired_events == []


# ── RED→GREEN 3: end_of_data excluded ───────────────────────────────────────

def test_end_of_data_exit_does_not_fire():
    trades = [{"exit_time": _ts(5), "exit_reason": "end_of_data"}]
    result = decide_exit_alert(trades, _dt(3), _dt(5))
    assert result.fired_events == []


def test_real_exit_fires_even_when_end_of_data_also_present():
    trades = [
        {"exit_time": _ts(5), "exit_reason": "end_of_data"},
        {"exit_time": _ts(5), "exit_reason": "sl"},
    ]
    result = decide_exit_alert(trades, _dt(3), _dt(5))
    assert len(result.fired_events) == 1
    assert result.fired_events[0].exit_reason == "sl"


# ── RED→GREEN 4: watermark advances ─────────────────────────────────────────

def test_exit_watermark_advances_when_fired():
    trades = [{"exit_time": _ts(5), "exit_reason": "signal"}]
    result = decide_exit_alert(trades, None, _dt(5))
    assert result.new_watermark.date() == _dt(5).date()


def test_exit_watermark_advances_even_when_no_fire():
    result = decide_exit_alert([], None, _dt(7))
    assert result.new_watermark.date() == _dt(7).date()


# ── Edge: naive exit timestamp normalised ───────────────────────────────────

def test_naive_exit_timestamp_is_normalised():
    result = decide_exit_alert(
        [{"exit_time": "2025-01-05T12:00:00", "exit_reason": "signal"}], None, _dt(5)
    )
    assert len(result.fired_events) == 1
    assert result.fired_events[0].exit_time.tzinfo is not None


# ════════════════════════════════════════════════════════════════════════════
# decide_drawdown_alert
# ════════════════════════════════════════════════════════════════════════════

def _equity_curve(*values: float) -> list[dict]:
    return [{"equity": v} for v in values]


# ── RED→GREEN 1: crossing fires ──────────────────────────────────────────────

def test_drawdown_crossing_fires():
    # Peak 100, final 75 → 25% drawdown, threshold 20% → fires
    curve = _equity_curve(100, 90, 75)
    result = decide_drawdown_alert(curve, threshold_pct=20.0, last_drawdown_pct=10.0)
    assert result.fired is True


def test_drawdown_current_pct_returned():
    curve = _equity_curve(100, 75)
    result = decide_drawdown_alert(curve, threshold_pct=20.0, last_drawdown_pct=10.0)
    assert abs(result.current_drawdown_pct - 25.0) < 0.01


# ── RED→GREEN 2: no crossing → no fire ──────────────────────────────────────

def test_drawdown_already_above_threshold_does_not_refire():
    # last_drawdown_pct already above threshold: no crossing
    curve = _equity_curve(100, 70)  # 30% drawdown
    result = decide_drawdown_alert(curve, threshold_pct=20.0, last_drawdown_pct=30.0)
    assert result.fired is False


def test_drawdown_below_threshold_does_not_fire():
    # 5% drawdown, threshold 20% → no fire
    curve = _equity_curve(100, 95)
    result = decide_drawdown_alert(curve, threshold_pct=20.0, last_drawdown_pct=3.0)
    assert result.fired is False


# ── RED→GREEN 3: re-arm after recovery ──────────────────────────────────────

def test_drawdown_recovery_re_arms():
    # Drawdown recovers below threshold: last_drawdown_pct now < threshold → re-armed
    # Next crossing should fire; this call just records recovery (no fire)
    curve = _equity_curve(100, 97)  # 3% drawdown (recovered)
    result = decide_drawdown_alert(curve, threshold_pct=20.0, last_drawdown_pct=25.0)
    assert result.fired is False
    assert result.current_drawdown_pct < 20.0  # stored state confirms recovery


def test_drawdown_fires_again_after_recovery():
    # First: recovery (last_drawdown_pct=25 → current=3, no fire)
    curve_recovered = _equity_curve(100, 97)
    r1 = decide_drawdown_alert(curve_recovered, threshold_pct=20.0, last_drawdown_pct=25.0)
    assert r1.fired is False

    # Second: new crossing (last_drawdown_pct=3 → current=30, fire)
    curve_crossed = _equity_curve(100, 70)
    r2 = decide_drawdown_alert(curve_crossed, threshold_pct=20.0, last_drawdown_pct=r1.current_drawdown_pct)
    assert r2.fired is True


# ── RED→GREEN 4: no prior state → armed ─────────────────────────────────────

def test_drawdown_no_prior_state_fires_on_first_crossing():
    curve = _equity_curve(100, 75)  # 25% drawdown
    result = decide_drawdown_alert(curve, threshold_pct=20.0, last_drawdown_pct=None)
    assert result.fired is True


def test_drawdown_no_prior_state_no_fire_if_below_threshold():
    curve = _equity_curve(100, 95)  # 5% drawdown
    result = decide_drawdown_alert(curve, threshold_pct=20.0, last_drawdown_pct=None)
    assert result.fired is False


# ── Edge: empty / zero-equity curve ─────────────────────────────────────────

def test_drawdown_empty_curve_does_not_fire():
    result = decide_drawdown_alert([], threshold_pct=20.0, last_drawdown_pct=None)
    assert result.fired is False
    assert result.current_drawdown_pct == 0.0


def test_drawdown_zero_peak_equity_does_not_fire():
    curve = _equity_curve(0, 0)
    result = decide_drawdown_alert(curve, threshold_pct=20.0, last_drawdown_pct=None)
    assert result.fired is False
