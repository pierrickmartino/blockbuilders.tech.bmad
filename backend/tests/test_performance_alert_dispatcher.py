"""Tests for the performance-alert daily dispatcher job.

Covers:
- "due" alert selection (watermark < last_closed_candle_ts)
- triggered_by='alert' enqueue
- inactive / missing version_id / already-pending skips
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlmodel import Session, select

from app.models.alert_rule import AlertRule, AlertType
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.worker import jobs


# ── helpers ──────────────────────────────────────────────────────────────────

def _seed_alert(session: Session, user_id, *, watermark=None, is_active=True, version_id=None, timeframe="1d"):
    strategy = Strategy(
        id=uuid4(),
        user_id=user_id,
        name="Dispatch Test",
        asset="BTC/USDT",
        timeframe=timeframe,
    )
    session.add(strategy)
    session.flush()

    version = StrategyVersion(
        id=version_id or uuid4(),
        strategy_id=strategy.id,
        version_number=1,
        definition_json={"blocks": [], "connections": []},
    )
    session.add(version)
    session.flush()

    alert = AlertRule(
        id=uuid4(),
        user_id=user_id,
        alert_type=AlertType.PERFORMANCE,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        alert_on_entry=True,
        is_active=is_active,
        last_fired_candle_ts=watermark,
    )
    session.add(alert)
    session.commit()
    return alert, strategy, version


class _MockQueue:
    """Captures enqueued jobs without connecting to Redis."""
    def __init__(self):
        self.jobs = []

    def enqueue(self, func_path, *args, job_timeout=None):
        self.jobs.append({"func": func_path, "args": args})


# ── RED→GREEN 1: due alert is enqueued with triggered_by='alert' ─────────────

def test_dispatcher_enqueues_due_alert(engine, test_user, monkeypatch):
    with Session(engine) as session:
        # Watermark is 3 days ago → alert is due
        old_watermark = datetime.now(timezone.utc) - timedelta(days=3)
        alert, strategy, version = _seed_alert(session, test_user.id, watermark=old_watermark)
        alert_strategy_id = strategy.id
        pinned_version_id = version.id  # capture before session closes

    mock_queue = _MockQueue()
    monkeypatch.setattr(jobs, "engine", engine)
    monkeypatch.setattr(jobs.settings, "scheduler_enabled", True)
    monkeypatch.setattr(jobs.settings, "default_initial_balance", 10000.0)
    monkeypatch.setattr(jobs.settings, "default_fee_rate", 0.001)
    monkeypatch.setattr(jobs.settings, "default_slippage_rate", 0.0005)

    monkeypatch.setattr(jobs, "Queue", lambda *a, **kw: mock_queue)
    monkeypatch.setattr(jobs, "Redis", type("_R", (), {"from_url": staticmethod(lambda url: None)}))

    jobs.evaluate_performance_alerts_daily()

    assert len(mock_queue.jobs) == 1
    assert mock_queue.jobs[0]["func"] == "app.worker.jobs.run_backtest_job"

    # Verify the BacktestRun was created with triggered_by='alert'
    with Session(engine) as session:
        run = session.exec(
            select(BacktestRun).where(
                BacktestRun.strategy_id == alert_strategy_id,
                BacktestRun.triggered_by == "alert",
            )
        ).first()
    assert run is not None
    assert run.strategy_version_id == pinned_version_id


# ── RED→GREEN 2: inactive alert is skipped ───────────────────────────────────

def test_dispatcher_skips_inactive_alert(engine, test_user, monkeypatch):
    with Session(engine) as session:
        _seed_alert(session, test_user.id, is_active=False)

    mock_queue = _MockQueue()
    monkeypatch.setattr(jobs, "engine", engine)
    monkeypatch.setattr(jobs.settings, "scheduler_enabled", True)
    monkeypatch.setattr(jobs.settings, "default_initial_balance", 10000.0)
    monkeypatch.setattr(jobs.settings, "default_fee_rate", 0.001)
    monkeypatch.setattr(jobs.settings, "default_slippage_rate", 0.0005)

    monkeypatch.setattr(jobs, "Queue", lambda *a, **kw: mock_queue)
    monkeypatch.setattr(jobs, "Redis", type("_R", (), {"from_url": staticmethod(lambda url: None)}))

    jobs.evaluate_performance_alerts_daily()

    assert len(mock_queue.jobs) == 0


# ── RED→GREEN 3: alert already evaluated today is skipped ────────────────────

def test_dispatcher_skips_alert_already_evaluated_today(engine, test_user, monkeypatch):
    with Session(engine) as session:
        # Watermark = yesterday midnight UTC → already evaluated
        yesterday = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1)
        _seed_alert(session, test_user.id, watermark=yesterday)

    mock_queue = _MockQueue()
    monkeypatch.setattr(jobs, "engine", engine)
    monkeypatch.setattr(jobs.settings, "scheduler_enabled", True)
    monkeypatch.setattr(jobs.settings, "default_initial_balance", 10000.0)
    monkeypatch.setattr(jobs.settings, "default_fee_rate", 0.001)
    monkeypatch.setattr(jobs.settings, "default_slippage_rate", 0.0005)

    monkeypatch.setattr(jobs, "Queue", lambda *a, **kw: mock_queue)
    monkeypatch.setattr(jobs, "Redis", type("_R", (), {"from_url": staticmethod(lambda url: None)}))

    jobs.evaluate_performance_alerts_daily()

    assert len(mock_queue.jobs) == 0


# ── RED→GREEN 4: existing pending alert-run is skipped (idempotency) ─────────

def test_dispatcher_skips_when_pending_run_exists(engine, test_user, monkeypatch):
    with Session(engine) as session:
        old_watermark = datetime.now(timezone.utc) - timedelta(days=3)
        alert, strategy, version = _seed_alert(session, test_user.id, watermark=old_watermark)

        # Create an already-pending run for this strategy
        pending_run = BacktestRun(
            id=uuid4(),
            user_id=test_user.id,
            strategy_id=strategy.id,
            strategy_version_id=version.id,
            status="pending",
            asset="BTC/USDT",
            timeframe="1d",
            date_from=datetime.now(timezone.utc) - timedelta(days=365),
            date_to=datetime.now(timezone.utc),
            triggered_by="alert",
        )
        session.add(pending_run)
        session.commit()

    mock_queue = _MockQueue()
    monkeypatch.setattr(jobs, "engine", engine)
    monkeypatch.setattr(jobs.settings, "scheduler_enabled", True)
    monkeypatch.setattr(jobs.settings, "default_initial_balance", 10000.0)
    monkeypatch.setattr(jobs.settings, "default_fee_rate", 0.001)
    monkeypatch.setattr(jobs.settings, "default_slippage_rate", 0.0005)

    monkeypatch.setattr(jobs, "Queue", lambda *a, **kw: mock_queue)
    monkeypatch.setattr(jobs, "Redis", type("_R", (), {"from_url": staticmethod(lambda url: None)}))

    jobs.evaluate_performance_alerts_daily()

    assert len(mock_queue.jobs) == 0


# ── scheduler disabled check ─────────────────────────────────────────────────

def test_dispatcher_no_ops_when_scheduler_disabled(monkeypatch):
    monkeypatch.setattr(jobs.settings, "scheduler_enabled", False)
    # Should return without raising
    jobs.evaluate_performance_alerts_daily()
