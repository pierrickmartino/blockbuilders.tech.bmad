from datetime import datetime, timezone
from unittest.mock import patch
from uuid import uuid4

from sqlmodel import Session, select

from app.models.alert_rule import AlertRule, AlertType
from app.models.backtest_run import BacktestRun
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.services import alert_evaluator
from app.services.delivery_intent import DeliveryIntent, EmailMessage


def _seed_strategy_with_run(session: Session, test_user_id):
    strategy = Strategy(
        id=uuid4(),
        user_id=test_user_id,
        name="Exit Alert Strategy",
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(strategy)

    version = StrategyVersion(
        id=uuid4(),
        strategy_id=strategy.id,
        version_number=1,
        definition_json={"blocks": [], "connections": []},
    )
    session.add(version)

    run = BacktestRun(
        id=uuid4(),
        user_id=test_user_id,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        status="completed",
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2025, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2025, 1, 10, tzinfo=timezone.utc),
        trades_key="trades-key",
        triggered_by="auto",
    )
    session.add(run)

    rule = AlertRule(
        id=uuid4(),
        user_id=test_user_id,
        alert_type=AlertType.PERFORMANCE,
        strategy_id=strategy.id,
        alert_on_exit=True,
        notify_email=False,
    )
    session.add(rule)

    session.commit()
    return run, rule


def test_end_of_data_exit_does_not_trigger_exit_alert(session: Session, test_user):
    run, _ = _seed_strategy_with_run(session, test_user.id)

    def fake_download_json(_key):
        return [{
            "exit_time": "2025-01-10T00:00:00+00:00",
            "exit_reason": "end_of_data",
        }]

    alert_evaluator.download_json = fake_download_json
    try:
        result = alert_evaluator.evaluate_alerts_for_run(run, session)
    finally:
        from app.backtest.storage import download_json as real_download_json
        alert_evaluator.download_json = real_download_json

    assert result is None
    notes = session.exec(select(Notification).where(Notification.user_id == test_user.id)).all()
    assert len(notes) == 0


def test_exit_alert_returns_delivery_intent_when_condition_fires(session: Session, test_user):
    run, _ = _seed_strategy_with_run(session, test_user.id)

    def fake_download_json(_key):
        return [{"exit_time": "2025-01-10T00:00:00+00:00", "exit_reason": "tp"}]

    alert_evaluator.download_json = fake_download_json
    try:
        result = alert_evaluator.evaluate_alerts_for_run(run, session)
    finally:
        from app.backtest.storage import download_json as real_download_json
        alert_evaluator.download_json = real_download_json

    assert isinstance(result, DeliveryIntent)
    assert result.email is None  # notify_email=False


def test_exit_alert_includes_specific_exit_reason(session: Session, test_user):
    run, _ = _seed_strategy_with_run(session, test_user.id)

    def fake_download_json(_key):
        return [{"exit_time": "2025-01-10T00:00:00+00:00", "exit_reason": "tp"}]

    alert_evaluator.download_json = fake_download_json
    try:
        alert_evaluator.evaluate_alerts_for_run(run, session)
    finally:
        from app.backtest.storage import download_json as real_download_json
        alert_evaluator.download_json = real_download_json

    notes = session.exec(select(Notification).where(Notification.user_id == test_user.id)).all()
    assert len(notes) == 1
    assert "exit today (take profit)" in notes[0].body


def test_exit_alert_email_enabled_returns_email_message(session: Session, test_user):
    run, rule = _seed_strategy_with_run(session, test_user.id)
    rule.notify_email = True
    session.add(rule)
    session.commit()

    def fake_download_json(_key):
        return [{"exit_time": "2025-01-10T00:00:00+00:00", "exit_reason": "tp"}]

    alert_evaluator.download_json = fake_download_json
    try:
        with patch("app.services.alert_evaluator.settings") as mock_settings:
            mock_settings.resend_api_key = "test-resend-key"
            mock_settings.frontend_url = "https://blockbuilders.tech"
            result = alert_evaluator.evaluate_alerts_for_run(run, session)
    finally:
        from app.backtest.storage import download_json as real_download_json
        alert_evaluator.download_json = real_download_json

    assert isinstance(result, DeliveryIntent)
    assert isinstance(result.email, EmailMessage)
    assert result.email.to == [test_user.email]
    assert "take profit" in result.email.html
    assert "Exit Alert Strategy" in result.email.subject


def test_no_inline_email_send_from_evaluate_alerts(session: Session, test_user):
    """evaluate_alerts_for_run must not call resend directly — delivery is caller's job."""
    run, rule = _seed_strategy_with_run(session, test_user.id)
    rule.notify_email = True
    session.add(rule)
    session.commit()

    def fake_download_json(_key):
        return [{"exit_time": "2025-01-10T00:00:00+00:00", "exit_reason": "tp"}]

    alert_evaluator.download_json = fake_download_json
    try:
        with patch("app.services.alert_evaluator.settings") as mock_settings, \
             patch("resend.Emails.send") as mock_send:
            mock_settings.resend_api_key = "test-resend-key"
            mock_settings.frontend_url = "https://blockbuilders.tech"
            alert_evaluator.evaluate_alerts_for_run(run, session)
            mock_send.assert_not_called()
    finally:
        from app.backtest.storage import download_json as real_download_json
        alert_evaluator.download_json = real_download_json
