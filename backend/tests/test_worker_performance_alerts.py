"""Tests for the sub-daily performance-alert dispatcher and catch-up coalescing."""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from sqlmodel import Session, select

from app.models.alert_rule import AlertRule, AlertType
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_template import StrategyTemplate  # registers strategy_templates table
from app.models.strategy_version import StrategyVersion
from app.worker import jobs


# ── helpers ──────────────────────────────────────────────────────────────────

def _make_strategy(session: Session, user_id, timeframe: str) -> Strategy:
    strategy = Strategy(
        id=uuid4(),
        user_id=user_id,
        name="Test Strategy",
        asset="BTC/USDT",
        timeframe=timeframe,
    )
    session.add(strategy)
    session.flush()
    return strategy


def _make_version(session: Session, strategy_id) -> StrategyVersion:
    version = StrategyVersion(id=uuid4(), strategy_id=strategy_id, version_number=1)
    session.add(version)
    session.flush()
    return version


def _make_alert(session: Session, user_id, strategy_id, version_id, last_fired=None) -> AlertRule:
    alert = AlertRule(
        id=uuid4(),
        user_id=user_id,
        alert_type=AlertType.PERFORMANCE,
        strategy_id=strategy_id,
        strategy_version_id=version_id,
        alert_on_entry=True,
        last_fired_candle_ts=last_fired,
    )
    session.add(alert)
    session.flush()
    return alert


# ── dispatcher: 1h alert due — enqueues backtest ──────────────────────────────

def test_sub_daily_dispatcher_enqueues_1h_alert_when_due(engine, test_user, monkeypatch):
    """A 1h alert with a stale watermark (> 1h ago) enqueues a new alert backtest."""
    now = datetime(2025, 3, 10, 14, 5, 0, tzinfo=timezone.utc)
    # last_fired two hours ago → new closed 1h candle at 13:00 is available
    stale_watermark = datetime(2025, 3, 10, 12, 0, 0, tzinfo=timezone.utc)

    with Session(engine) as session:
        strategy = _make_strategy(session, test_user.id, "1h")
        version = _make_version(session, strategy.id)
        _make_alert(session, test_user.id, strategy.id, version.id, last_fired=stale_watermark)
        session.commit()

    monkeypatch.setattr(jobs, "engine", engine)
    monkeypatch.setattr(jobs.settings, "scheduler_enabled", True)

    mock_queue = MagicMock()
    with patch("app.worker.jobs.Queue", return_value=mock_queue), \
         patch("app.worker.jobs.Redis"):
        jobs.evaluate_performance_alerts_sub_daily(now=now)

    mock_queue.enqueue.assert_called_once()
    call_args = mock_queue.enqueue.call_args
    assert call_args[0][0] == "app.worker.jobs.run_backtest_job"

    with Session(engine) as session:
        runs = session.exec(select(BacktestRun)).all()
    assert len(runs) == 1
    assert runs[0].triggered_by == "alert"
    assert runs[0].timeframe == "1h"


# ── dispatcher: 4h alert not yet due — skips ────────────────────────────────

def test_sub_daily_dispatcher_skips_4h_alert_not_yet_due(engine, test_user, monkeypatch):
    """A 4h alert whose watermark already covers the latest closed 4h candle is skipped."""
    now = datetime(2025, 3, 10, 14, 5, 0, tzinfo=timezone.utc)
    # At 14:05 UTC, last closed 4h candle opened at 08:00 UTC
    # watermark = 08:00 → already evaluated for that candle
    watermark_already_current = datetime(2025, 3, 10, 8, 0, 0, tzinfo=timezone.utc)

    with Session(engine) as session:
        strategy = _make_strategy(session, test_user.id, "4h")
        version = _make_version(session, strategy.id)
        _make_alert(session, test_user.id, strategy.id, version.id, last_fired=watermark_already_current)
        session.commit()

    monkeypatch.setattr(jobs, "engine", engine)
    monkeypatch.setattr(jobs.settings, "scheduler_enabled", True)

    mock_queue = MagicMock()
    with patch("app.worker.jobs.Queue", return_value=mock_queue), \
         patch("app.worker.jobs.Redis"):
        jobs.evaluate_performance_alerts_sub_daily(now=now)

    mock_queue.enqueue.assert_not_called()

    with Session(engine) as session:
        runs = session.exec(select(BacktestRun)).all()
    assert len(runs) == 0


# ── dispatcher: 4h alert with new closed candle — enqueues ──────────────────

def test_sub_daily_dispatcher_enqueues_4h_alert_when_new_candle(engine, test_user, monkeypatch):
    """A 4h alert whose watermark is behind the latest closed 4h candle gets enqueued."""
    now = datetime(2025, 3, 10, 16, 5, 0, tzinfo=timezone.utc)
    # At 16:05 UTC, last closed 4h candle opened at 12:00 UTC
    # watermark = 08:00 → 12:00 candle is new
    stale_watermark = datetime(2025, 3, 10, 8, 0, 0, tzinfo=timezone.utc)

    with Session(engine) as session:
        strategy = _make_strategy(session, test_user.id, "4h")
        version = _make_version(session, strategy.id)
        _make_alert(session, test_user.id, strategy.id, version.id, last_fired=stale_watermark)
        session.commit()

    monkeypatch.setattr(jobs, "engine", engine)
    monkeypatch.setattr(jobs.settings, "scheduler_enabled", True)

    mock_queue = MagicMock()
    with patch("app.worker.jobs.Queue", return_value=mock_queue), \
         patch("app.worker.jobs.Redis"):
        jobs.evaluate_performance_alerts_sub_daily(now=now)

    mock_queue.enqueue.assert_called_once()

    with Session(engine) as session:
        runs = session.exec(select(BacktestRun)).all()
    assert len(runs) == 1
    assert runs[0].timeframe == "4h"
    # SQLite stores datetimes without tz; compare naive
    assert runs[0].date_to == datetime(2025, 3, 10, 12, 0, 0)


# ── dispatcher: 1d strategies not touched ───────────────────────────────────

def test_sub_daily_dispatcher_ignores_1d_strategies(engine, test_user, monkeypatch):
    """1d strategies are handled by the existing daily job and must not be touched here."""
    now = datetime(2025, 3, 10, 14, 5, 0, tzinfo=timezone.utc)
    stale_watermark = datetime(2025, 3, 8, 0, 0, 0, tzinfo=timezone.utc)

    with Session(engine) as session:
        strategy = _make_strategy(session, test_user.id, "1d")
        version = _make_version(session, strategy.id)
        _make_alert(session, test_user.id, strategy.id, version.id, last_fired=stale_watermark)
        session.commit()

    monkeypatch.setattr(jobs, "engine", engine)
    monkeypatch.setattr(jobs.settings, "scheduler_enabled", True)

    mock_queue = MagicMock()
    with patch("app.worker.jobs.Queue", return_value=mock_queue), \
         patch("app.worker.jobs.Redis"):
        jobs.evaluate_performance_alerts_sub_daily(now=now)

    mock_queue.enqueue.assert_not_called()


# ── catch-up coalescing via decide_entry_alert ───────────────────────────────

def test_catch_up_multi_candle_gap_returns_all_entries():
    """All entries across a multi-candle gap are returned in a single call.

    Watermark = 04:00 (last evaluated 4h candle); entries are each in a
    strictly later 4h candle. All three must fire so the caller can coalesce
    them into one notification rather than a burst.
    """
    from app.services.performance_alert_decision import decide_entry_alert

    watermark = datetime(2025, 3, 10, 4, 0, 0, tzinfo=timezone.utc)
    run_date_to = datetime(2025, 3, 10, 20, 0, 0, tzinfo=timezone.utc)

    # Three entries, each in a different 4h candle strictly after the watermark
    trades = [
        {"entry_time": "2025-03-10T09:00:00+00:00"},  # in 08:00 4h candle (new)
        {"entry_time": "2025-03-10T13:00:00+00:00"},  # in 12:00 4h candle (new)
        {"entry_time": "2025-03-10T17:00:00+00:00"},  # in 16:00 4h candle (new)
    ]

    result = decide_entry_alert(trades, watermark, run_date_to, timeframe="4h")

    assert len(result.fired_events) == 3
    assert result.new_watermark == run_date_to


def test_catch_up_already_fired_entry_excluded():
    """An entry inside the watermark candle must not re-fire."""
    from app.services.performance_alert_decision import decide_entry_alert

    # Watermark = 08:00 means the 08:00-12:00 candle was already evaluated.
    watermark = datetime(2025, 3, 10, 8, 0, 0, tzinfo=timezone.utc)
    run_date_to = datetime(2025, 3, 10, 20, 0, 0, tzinfo=timezone.utc)

    trades = [
        {"entry_time": "2025-03-10T09:00:00+00:00"},  # inside 08:00 candle — skip
        {"entry_time": "2025-03-10T13:00:00+00:00"},  # inside 12:00 candle — fire
    ]

    result = decide_entry_alert(trades, watermark, run_date_to, timeframe="4h")

    assert len(result.fired_events) == 1
    assert result.fired_events[0].entry_time.hour == 13
