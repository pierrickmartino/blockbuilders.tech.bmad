"""Tests: _evaluate_pinned_alert returns a DeliveryIntent for entry/exit/drawdown conditions."""
from datetime import datetime, timezone
from unittest.mock import patch
from uuid import uuid4

import pytest
from sqlmodel import Session

from app.models.alert_rule import AlertRule, AlertType
from app.models.backtest_run import BacktestRun
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.strategy_template import StrategyTemplate  # registers table
from app.models.strategy_version import StrategyVersion
from app.services import run_finalization
from app.services.run_finalization import (
    _evaluate_pinned_alert,
    _post_webhooks_bounded,
    DeliveryIntent,
    MAX_ALERT_WEBHOOK_EVENTS,
    ALERT_WEBHOOK_TIME_BUDGET_SECONDS,
)
from app.worker import jobs  # for patching post_webhook


# ── helpers ───────────────────────────────────────────────────────────────────

def _seed(
    session: Session,
    user_id,
    notify_webhook: bool = True,
    alert_on_entry: bool = True,
    alert_on_exit: bool = False,
    threshold_pct: float | None = None,
    equity_curve_key: str | None = None,
    date_to: datetime | None = None,
):
    strategy = Strategy(
        id=uuid4(), user_id=user_id, name="S", asset="BTC/USDT", timeframe="1h"
    )
    session.add(strategy)
    version = StrategyVersion(id=uuid4(), strategy_id=strategy.id, version_number=1)
    session.add(version)
    run = BacktestRun(
        id=uuid4(),
        user_id=user_id,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        status="completed",
        asset="BTC/USDT",
        timeframe="1h",
        date_from=datetime(2025, 3, 10, 0, 0, 0, tzinfo=timezone.utc),
        date_to=date_to or datetime(2025, 3, 10, 12, 0, 0, tzinfo=timezone.utc),
        trades_key="trades.json",
        equity_curve_key=equity_curve_key,
        triggered_by="alert",
    )
    session.add(run)
    alert = AlertRule(
        id=uuid4(),
        user_id=user_id,
        alert_type=AlertType.PERFORMANCE,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        alert_on_entry=alert_on_entry,
        alert_on_exit=alert_on_exit,
        threshold_pct=threshold_pct,
        notify_webhook=notify_webhook,
        webhook_url="https://example.com/hook" if notify_webhook else None,
    )
    session.add(alert)
    session.commit()
    return run.id, alert.id


_ENTRY_TRADE = {"entry_time": "2025-03-10T09:00:00+00:00"}
_EXIT_TRADE_TP = {"exit_time": "2025-03-10T11:00:00+00:00", "exit_reason": "tp"}
_EXIT_TRADE_SL = {"exit_time": "2025-03-10T11:00:00+00:00", "exit_reason": "sl"}
_EXIT_TRADE_EOD = {"exit_time": "2025-03-10T11:00:00+00:00", "exit_reason": "end_of_data"}

_EQUITY_ABOVE_THRESHOLD = [
    {"equity": 1000.0},
    {"equity": 750.0},  # 25% drawdown — above 20% threshold
]


# ── Entry intent ──────────────────────────────────────────────────────────────

def test_entry_fires_returns_intent_with_webhook(engine, test_user):
    with Session(engine) as session:
        run_id, alert_id = _seed(session, test_user.id, notify_webhook=True)

    with patch("app.backtest.storage.download_json", return_value=[_ENTRY_TRADE]), \
         patch("app.services.run_finalization.settings") as mock_settings:
        mock_settings.resend_api_key = None
        mock_settings.frontend_url = "https://blockbuilders.tech"
        with Session(engine) as session:
            run = session.get(BacktestRun, run_id)
            intent = _evaluate_pinned_alert(run, session)

    assert intent is not None
    assert intent.webhooks is not None
    assert intent.webhooks.url == "https://example.com/hook"
    assert len(intent.webhooks.payloads) == 1
    payload = intent.webhooks.payloads[0]
    assert payload["type"] == "performance_alert"
    assert payload["event"] == "entry"
    assert "side" not in payload
    assert "size" not in payload


def test_no_webhook_intent_when_notify_webhook_false(engine, test_user):
    with Session(engine) as session:
        run_id, alert_id = _seed(session, test_user.id, notify_webhook=False)

    with patch("app.backtest.storage.download_json", return_value=[_ENTRY_TRADE]), \
         patch("app.services.run_finalization.settings") as mock_settings:
        mock_settings.resend_api_key = None
        mock_settings.frontend_url = "https://blockbuilders.tech"
        with Session(engine) as session:
            run = session.get(BacktestRun, run_id)
            intent = _evaluate_pinned_alert(run, session)

    assert intent is not None
    assert intent.webhooks is None


# ── Exit intent ───────────────────────────────────────────────────────────────

def test_exit_fires_returns_intent_with_webhook(engine, test_user):
    with Session(engine) as session:
        run_id, alert_id = _seed(
            session, test_user.id, alert_on_entry=False, alert_on_exit=True
        )

    with patch("app.backtest.storage.download_json", return_value=[_EXIT_TRADE_TP]), \
         patch("app.services.run_finalization.settings") as mock_settings:
        mock_settings.resend_api_key = None
        mock_settings.frontend_url = "https://blockbuilders.tech"
        with Session(engine) as session:
            run = session.get(BacktestRun, run_id)
            intent = _evaluate_pinned_alert(run, session)

    assert intent is not None
    assert intent.webhooks is not None
    assert intent.webhooks.url == "https://example.com/hook"
    assert len(intent.webhooks.payloads) == 1
    payload = intent.webhooks.payloads[0]
    assert payload["event"] == "exit"
    assert payload["exit_reason"] == "tp"
    assert "drawdown_pct" not in payload


def test_end_of_data_exit_returns_intent_with_no_webhook(engine, test_user):
    with Session(engine) as session:
        run_id, _ = _seed(
            session, test_user.id, alert_on_entry=False, alert_on_exit=True
        )

    with patch("app.backtest.storage.download_json", return_value=[_EXIT_TRADE_EOD]), \
         patch("app.services.run_finalization.settings") as mock_settings:
        mock_settings.resend_api_key = None
        mock_settings.frontend_url = "https://blockbuilders.tech"
        with Session(engine) as session:
            run = session.get(BacktestRun, run_id)
            intent = _evaluate_pinned_alert(run, session)

    assert intent is not None
    assert intent.webhooks is None


# ── Drawdown intent ───────────────────────────────────────────────────────────

def test_drawdown_fires_returns_intent_with_webhook(engine, test_user):
    with Session(engine) as session:
        run_id, alert_id = _seed(
            session,
            test_user.id,
            alert_on_entry=False,
            threshold_pct=20.0,
            equity_curve_key="equity.json",
        )

    with patch("app.backtest.storage.download_json", return_value=_EQUITY_ABOVE_THRESHOLD), \
         patch("app.services.run_finalization.settings") as mock_settings:
        mock_settings.resend_api_key = None
        mock_settings.frontend_url = "https://blockbuilders.tech"
        with Session(engine) as session:
            run = session.get(BacktestRun, run_id)
            intent = _evaluate_pinned_alert(run, session)

    assert intent is not None
    assert intent.webhooks is not None
    assert intent.webhooks.url == "https://example.com/hook"
    assert len(intent.webhooks.payloads) == 1
    payload = intent.webhooks.payloads[0]
    assert payload["event"] == "drawdown_threshold"
    assert payload["drawdown_pct"] == pytest.approx(25.0)
    assert "exit_reason" not in payload


# ── Ordering + coalescing ─────────────────────────────────────────────────────

def test_entry_then_exit_two_ordered_payloads_one_notification(engine, test_user):
    """Entry@T1 + exit@T3 → two webhook payloads in chronological order, one notification added."""
    with Session(engine) as session:
        run_id, alert_id = _seed(
            session,
            test_user.id,
            alert_on_entry=True,
            alert_on_exit=True,
            date_to=datetime(2025, 3, 10, 14, 0, 0, tzinfo=timezone.utc),
        )

    trades = [
        {"entry_time": "2025-03-10T09:00:00+00:00", "exit_time": "2025-03-10T11:00:00+00:00", "exit_reason": "tp"},
    ]
    created_notifications = []

    original_add = Session.add

    def tracking_add(self, obj):
        if isinstance(obj, Notification):
            created_notifications.append(obj)
        return original_add(self, obj)

    with patch("app.backtest.storage.download_json", return_value=trades), \
         patch("app.services.run_finalization.settings") as mock_settings, \
         patch.object(Session, "add", tracking_add):
        mock_settings.resend_api_key = None
        mock_settings.frontend_url = "https://blockbuilders.tech"
        with Session(engine) as session:
            run = session.get(BacktestRun, run_id)
            intent = _evaluate_pinned_alert(run, session)

    assert intent is not None
    assert intent.webhooks is not None
    assert len(intent.webhooks.payloads) == 2
    events = [p["event"] for p in intent.webhooks.payloads]
    candle_tss = [p["candle_ts"] for p in intent.webhooks.payloads]
    assert events[0] == "entry"
    assert events[1] == "exit"
    assert candle_tss[0] < candle_tss[1]
    assert len(created_notifications) == 1


# ── Version pinning: stale runs must not fire or advance the rule ─────────────

def test_stale_version_returns_none(engine, test_user):
    """A completed run targeting a stale version must return None and not touch the rule."""
    with Session(engine) as session:
        run_id, alert_id = _seed(session, test_user.id, notify_webhook=True)
        run = session.get(BacktestRun, run_id)
        new_version = StrategyVersion(
            id=uuid4(), strategy_id=run.strategy_id, version_number=2
        )
        session.add(new_version)
        rule = session.get(AlertRule, alert_id)
        rule.strategy_version_id = new_version.id
        rule.last_fired_candle_ts = None
        session.add(rule)
        session.commit()

    with patch("app.backtest.storage.download_json", return_value=[_ENTRY_TRADE]), \
         patch("app.services.run_finalization.settings") as mock_settings:
        mock_settings.resend_api_key = None
        mock_settings.frontend_url = "https://blockbuilders.tech"
        with Session(engine) as session:
            run = session.get(BacktestRun, run_id)
            intent = _evaluate_pinned_alert(run, session)

    assert intent is None
    with Session(engine) as session:
        refreshed = session.get(AlertRule, alert_id)
    assert refreshed.last_fired_candle_ts is None  # untouched


# ── Watermark advance (session mutation, no commit) ───────────────────────────

def test_watermark_staged_in_session_not_committed(engine, test_user):
    """The evaluator session.add()s the watermark without committing — finalize_run commits."""
    with Session(engine) as session:
        run_id, alert_id = _seed(session, test_user.id, notify_webhook=True)

    with patch("app.backtest.storage.download_json", return_value=[_ENTRY_TRADE]), \
         patch("app.services.run_finalization.settings") as mock_settings:
        mock_settings.resend_api_key = None
        mock_settings.frontend_url = "https://blockbuilders.tech"
        with Session(engine) as session:
            run = session.get(BacktestRun, run_id)
            intent = _evaluate_pinned_alert(run, session)
            # Do NOT commit — the evaluator itself must not commit
            # Verify watermark is pending in session but not yet flushed to DB
            rule = session.get(AlertRule, alert_id)
            # In-session the rule has the new watermark staged
            assert rule.last_fired_candle_ts is not None

    # After the session closes without commit, the DB should NOT have the watermark
    with Session(engine) as session:
        refreshed = session.get(AlertRule, alert_id)
    assert refreshed.last_fired_candle_ts is None  # rolled back


# ── Watermark durable before delivery via finalize_run ───────────────────────

def test_finalize_run_commits_watermark_before_delivery(engine, test_user, monkeypatch):
    """finalize_run commits watermark before calling _post_webhooks_bounded."""
    monkeypatch.setattr(jobs, "engine", engine)

    with Session(engine) as session:
        run_id, alert_id = _seed(session, test_user.id, notify_webhook=True)

    watermark_at_delivery_time = []

    def capture_watermark(url, payloads):
        with Session(engine) as s:
            rule = s.get(AlertRule, alert_id)
            watermark_at_delivery_time.append(rule.last_fired_candle_ts)

    with patch("app.services.run_finalization._post_webhooks_bounded", side_effect=capture_watermark), \
         patch("app.backtest.storage.download_json", return_value=[_ENTRY_TRADE]), \
         patch("app.services.run_finalization.settings") as mock_settings:
        mock_settings.resend_api_key = None
        mock_settings.frontend_url = "https://blockbuilders.tech"
        from app.services.run_finalization import finalize_run
        with Session(engine) as session:
            run = session.get(BacktestRun, run_id)
            finalize_run(run, session)

    assert len(watermark_at_delivery_time) == 1
    assert watermark_at_delivery_time[0] is not None


# ── Bounded webhook fan-out ───────────────────────────────────────────────────

def test_post_webhooks_bounded_caps_event_count():
    posted = []
    payloads = [{"n": i} for i in range(MAX_ALERT_WEBHOOK_EVENTS + 10)]
    with patch.object(jobs, "post_webhook", side_effect=lambda u, p: posted.append(p)):
        _post_webhooks_bounded("https://example.com/hook", payloads)
    assert len(posted) == MAX_ALERT_WEBHOOK_EVENTS


def test_post_webhooks_bounded_stops_when_time_budget_exhausted(monkeypatch):
    posted = []
    ticks = iter([0.0, 0.0, 1.0, ALERT_WEBHOOK_TIME_BUDGET_SECONDS + 1.0,
                  ALERT_WEBHOOK_TIME_BUDGET_SECONDS + 2.0])
    monkeypatch.setattr(run_finalization.time, "monotonic", lambda: next(ticks))
    with patch.object(jobs, "post_webhook", side_effect=lambda u, p: posted.append(p)):
        _post_webhooks_bounded("https://example.com/hook", [{"n": i} for i in range(5)])
    assert 0 < len(posted) < 5
