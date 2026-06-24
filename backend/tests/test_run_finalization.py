"""Unit tests for finalize_run — drives the four completed-run side-effects
directly against committed fixtures; no pipeline, candles, or uploads needed."""
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

from sqlmodel import Session, select

from app.models.alert_rule import AlertRule, AlertType
from app.models.backtest_run import BacktestRun
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.strategy_template import StrategyTemplate  # registers table
from app.models.strategy_version import StrategyVersion
from app.services.delivery_intent import DeliveryIntent, EmailMessage
from app.services.run_finalization import finalize_run


def _make_completed_run(session: Session, user, triggered_by: str = "manual") -> BacktestRun:
    strategy = Strategy(
        id=uuid4(),
        user_id=user.id,
        name="Finalization Test Strategy",
        asset="BTC/USDT",
        timeframe="1d",
        auto_update_enabled=False,
        auto_update_lookback_days=30,
    )
    session.add(strategy)
    session.flush()

    version = StrategyVersion(
        id=uuid4(),
        strategy_id=strategy.id,
        version_number=1,
        definition_json={},
    )
    session.add(version)
    session.flush()

    run = BacktestRun(
        id=uuid4(),
        user_id=user.id,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        status="completed",
        triggered_by=triggered_by,
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 1, 31, tzinfo=timezone.utc),
        initial_balance=10000.0,
        fee_rate=0.001,
        slippage_rate=0.001,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


# ── Notification ──────────────────────────────────────────────────────────────

def test_notification_created_for_manual_run(session, test_user):
    run = _make_completed_run(session, test_user, triggered_by="manual")
    finalize_run(run, session)
    session.commit()

    notifications = session.exec(
        select(Notification).where(
            Notification.user_id == test_user.id,
            Notification.type == "backtest_completed",
        )
    ).all()
    assert len(notifications) == 1
    assert "BTC/USDT" in notifications[0].body


def test_notification_created_for_auto_run(session, test_user):
    run = _make_completed_run(session, test_user, triggered_by="auto")
    finalize_run(run, session)
    session.commit()

    notifications = session.exec(
        select(Notification).where(
            Notification.user_id == test_user.id,
            Notification.type == "backtest_completed",
        )
    ).all()
    assert len(notifications) == 1


def test_notification_skipped_for_alert_run(session, test_user, monkeypatch):
    from app.services import run_finalization
    monkeypatch.setattr(run_finalization, "_evaluate_pinned_alert", lambda r, s: None)

    run = _make_completed_run(session, test_user, triggered_by="alert")
    finalize_run(run, session)
    session.commit()

    notifications = session.exec(
        select(Notification).where(
            Notification.user_id == test_user.id,
            Notification.type == "backtest_completed",
        )
    ).all()
    assert len(notifications) == 0


def test_notification_skipped_for_comparison_run(session, test_user):
    run = _make_completed_run(session, test_user, triggered_by="comparison")
    finalize_run(run, session)
    session.commit()

    notifications = session.exec(
        select(Notification).where(
            Notification.user_id == test_user.id,
            Notification.type == "backtest_completed",
        )
    ).all()
    assert len(notifications) == 0


# ── Onboarding ────────────────────────────────────────────────────────────────

def test_onboarding_flips_on_first_completed_run(session, test_user):
    assert not test_user.has_completed_onboarding

    run = _make_completed_run(session, test_user, triggered_by="manual")
    finalize_run(run, session)
    session.commit()

    session.refresh(test_user)
    assert test_user.has_completed_onboarding is True


def test_onboarding_is_idempotent(session, test_user):
    test_user.has_completed_onboarding = True
    session.add(test_user)
    session.commit()

    run = _make_completed_run(session, test_user, triggered_by="manual")
    finalize_run(run, session)
    session.commit()

    session.refresh(test_user)
    assert test_user.has_completed_onboarding is True


# ── last_auto_run_at ──────────────────────────────────────────────────────────

def test_last_auto_run_at_set_on_auto_run(session, test_user):
    run = _make_completed_run(session, test_user, triggered_by="auto")

    strategy = session.exec(
        select(Strategy).where(Strategy.id == run.strategy_id)
    ).first()
    assert strategy.last_auto_run_at is None

    finalize_run(run, session)
    session.commit()

    session.refresh(strategy)
    assert strategy.last_auto_run_at is not None


def test_last_auto_run_at_not_set_on_manual_run(session, test_user):
    run = _make_completed_run(session, test_user, triggered_by="manual")

    strategy = session.exec(
        select(Strategy).where(Strategy.id == run.strategy_id)
    ).first()

    finalize_run(run, session)
    session.commit()

    session.refresh(strategy)
    assert strategy.last_auto_run_at is None


# ── Old-style alert delivery ──────────────────────────────────────────────────

def _add_unpinned_alert_rule(session: Session, strategy_id, user_id):
    rule = AlertRule(
        id=uuid4(),
        user_id=user_id,
        alert_type=AlertType.PERFORMANCE,
        strategy_id=strategy_id,
        alert_on_exit=True,
        notify_email=False,
    )
    session.add(rule)
    session.commit()
    return rule


def test_finalize_run_delivers_old_style_intent_after_commit(session, test_user):
    """finalize_run must call _deliver_intent with the DeliveryIntent from evaluate_alerts_for_run."""
    run = _make_completed_run(session, test_user, triggered_by="auto")
    _add_unpinned_alert_rule(session, run.strategy_id, test_user.id)

    fake_intent = DeliveryIntent(
        email=EmailMessage(
            from_="noreply@blockbuilders.tech",
            to=[test_user.email],
            subject="Test alert",
            html="<p>alert</p>",
        )
    )

    with patch("app.services.run_finalization.evaluate_alerts_for_run", return_value=fake_intent) as mock_eval, \
         patch("app.services.run_finalization._deliver_intent") as mock_deliver:
        finalize_run(run, session)

    mock_eval.assert_called_once_with(run, session)
    mock_deliver.assert_called_once_with(fake_intent)
