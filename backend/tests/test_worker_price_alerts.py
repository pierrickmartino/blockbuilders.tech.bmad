from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from sqlmodel import Session, select

from app.models.alert_rule import AlertRule, AlertType, Direction
from app.worker import jobs


def test_evaluate_price_alerts_handles_naive_expiration(engine, test_user, monkeypatch):
    with Session(engine) as session:
        alert = AlertRule(
            id=uuid4(),
            user_id=test_user.id,
            alert_type=AlertType.PRICE,
            asset="BTC/USDT",
            direction=Direction.ABOVE,
            threshold_price=Decimal("50000"),
            expires_at=(datetime.now(timezone.utc) - timedelta(minutes=5)).replace(tzinfo=None),
        )
        session.add(alert)
        session.commit()
        alert_id = alert.id

    monkeypatch.setattr(jobs, "engine", engine)
    monkeypatch.setattr(jobs.settings, "scheduler_enabled", True)

    jobs.evaluate_price_alerts()

    with Session(engine) as session:
        stored_alert = session.exec(
            select(AlertRule).where(AlertRule.id == alert_id)
        ).one()

    assert stored_alert.is_active is False


def test_evaluate_price_alerts_triggers_active_alert(engine, test_user, monkeypatch):
    with Session(engine) as session:
        alert = AlertRule(
            id=uuid4(),
            user_id=test_user.id,
            alert_type=AlertType.PRICE,
            asset="BTC/USDT",
            direction=Direction.ABOVE,
            threshold_price=Decimal("50000"),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
            last_checked_price=Decimal("49000"),
        )
        session.add(alert)
        session.commit()
        alert_id = alert.id

    monkeypatch.setattr(jobs, "engine", engine)
    monkeypatch.setattr(jobs.settings, "scheduler_enabled", True)
    monkeypatch.setattr(jobs, "_fetch_current_prices", lambda: {"BTC/USDT": Decimal("51000")})
    monkeypatch.setattr(jobs, "_send_price_alert_email", lambda *args, **kwargs: None)
    monkeypatch.setattr(jobs, "_send_price_alert_webhook", lambda *args, **kwargs: None)

    jobs.evaluate_price_alerts()

    with Session(engine) as session:
        stored_alert = session.exec(
            select(AlertRule).where(AlertRule.id == alert_id)
        ).one()

    assert stored_alert.is_active is False
    assert stored_alert.last_triggered_at is not None
    assert stored_alert.last_checked_price == Decimal("51000")
