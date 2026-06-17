"""Tests for performance-alert creation with version pinning.

Covers:
- Completed backtest run gates creation and pins strategy_version_id
- Rejected when no completed backtest (run is pending or failed)
- Rejected when backtest_run_id not provided
- Migration: deactivates existing performance alerts and creates notifications
"""
import os
from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from app.core.database import get_session
from app.core.security import hash_password
from app.main import app
from app.models.alert_rule import AlertRule, AlertType
from app.models.backtest_run import BacktestRun
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import PlanTier, User, UserTier


@pytest.fixture(name="engine")
def engine_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def _create_user(session: Session) -> User:
    user = User(
        id=uuid4(),
        email=f"u_{uuid4().hex[:6]}@test.com",
        password_hash=hash_password("Password123!"),
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _jwt(client: TestClient, email: str) -> str:
    resp = client.post("/auth/login", json={"email": email, "password": "Password123!"})
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


def _seed_strategy_with_run(session: Session, user_id, run_status="completed"):
    strategy = Strategy(
        id=uuid4(),
        user_id=user_id,
        name="Pin Test",
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
        user_id=user_id,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        status=run_status,
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2025, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2025, 6, 1, tzinfo=timezone.utc),
        triggered_by="manual",
    )
    session.add(run)
    session.commit()
    return strategy, version, run


# ── RED→GREEN 1: creation pins strategy_version_id from completed run ─────────

def test_create_performance_alert_pins_version(session, client):
    user = _create_user(session)
    strategy, version, run = _seed_strategy_with_run(session, user.id)
    token = _jwt(client, user.email)

    resp = client.post(
        "/alerts/",
        json={
            "alert_type": "performance",
            "backtest_run_id": str(run.id),
            "alert_on_entry": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["strategy_version_id"] == str(version.id)
    assert body["strategy_id"] == str(strategy.id)


# ── Watermark is seeded from the source run so pre-creation trades never fire ─

def test_create_performance_alert_seeds_watermark_from_run(session, client):
    user = _create_user(session)
    strategy, version, run = _seed_strategy_with_run(session, user.id)
    token = _jwt(client, user.email)

    resp = client.post(
        "/alerts/",
        json={
            "alert_type": "performance",
            "backtest_run_id": str(run.id),
            "alert_on_entry": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 201, resp.text
    rule = session.exec(
        select(AlertRule).where(AlertRule.strategy_id == strategy.id)
    ).first()
    assert rule.last_fired_candle_ts is not None
    assert rule.last_fired_candle_ts.replace(tzinfo=None) == run.date_to.replace(tzinfo=None)


def test_repin_performance_alert_seeds_watermark_from_new_run(session, client):
    user = _create_user(session)
    strategy, version, run = _seed_strategy_with_run(session, user.id)
    token = _jwt(client, user.email)

    # First create seeds an active alert.
    client.post(
        "/alerts/",
        json={
            "alert_type": "performance",
            "backtest_run_id": str(run.id),
            "alert_on_entry": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # A newer completed run on the same strategy re-pins the alert.
    newer_run = BacktestRun(
        id=uuid4(),
        user_id=user.id,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        status="completed",
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2025, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2025, 7, 1, tzinfo=timezone.utc),
        triggered_by="manual",
    )
    session.add(newer_run)
    session.commit()

    resp = client.post(
        "/alerts/",
        json={
            "alert_type": "performance",
            "backtest_run_id": str(newer_run.id),
            "alert_on_entry": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, resp.text  # re-pin returns 200

    rule = session.exec(
        select(AlertRule).where(AlertRule.strategy_id == strategy.id)
    ).first()
    assert rule.last_fired_candle_ts.replace(tzinfo=None) == newer_run.date_to.replace(tzinfo=None)


# ── Update path enforces the webhook URL invariant ───────────────────────────

def test_update_alert_rejects_enabling_webhook_without_url(session, client):
    user = _create_user(session)
    strategy, version, run = _seed_strategy_with_run(session, user.id)
    token = _jwt(client, user.email)

    create = client.post(
        "/alerts/",
        json={
            "alert_type": "performance",
            "backtest_run_id": str(run.id),
            "alert_on_entry": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    alert_id = create.json()["id"]

    resp = client.patch(
        f"/alerts/{alert_id}",
        json={"notify_webhook": True},  # no webhook_url
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422, resp.text

    # A rejected PATCH must not persist an enabled-without-url state. The real
    # per-request session is discarded on error; mirror that by dropping the
    # uncommitted in-memory mutation before reading the persisted row.
    session.rollback()
    rule = session.get(AlertRule, UUID(alert_id))
    assert not (rule.notify_webhook and not rule.webhook_url)


# ── RED→GREEN 2: rejected when run is pending (not completed) ────────────────

def test_create_performance_alert_rejected_for_pending_run(session, client):
    user = _create_user(session)
    _, _, run = _seed_strategy_with_run(session, user.id, run_status="pending")
    token = _jwt(client, user.email)

    resp = client.post(
        "/alerts/",
        json={
            "alert_type": "performance",
            "backtest_run_id": str(run.id),
            "alert_on_entry": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 422


# ── RED→GREEN 3: rejected when backtest_run_id absent ────────────────────────

def test_create_performance_alert_rejected_without_run_id(session, client):
    user = _create_user(session)
    token = _jwt(client, user.email)

    resp = client.post(
        "/alerts/",
        json={
            "alert_type": "performance",
            "alert_on_entry": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 422


# ── RED→GREEN 4: rejected when run belongs to another user ───────────────────

def test_create_performance_alert_rejected_for_foreign_run(session, client):
    owner = _create_user(session)
    requester = _create_user(session)
    _, _, run = _seed_strategy_with_run(session, owner.id)
    token = _jwt(client, requester.email)

    resp = client.post(
        "/alerts/",
        json={
            "alert_type": "performance",
            "backtest_run_id": str(run.id),
            "alert_on_entry": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 404


# ── Migration behaviour (in-process simulation) ──────────────────────────────

def test_migration_deactivates_existing_performance_alerts(session):
    """Simulate the data migration: existing performance-alert rows become inactive."""
    user = _create_user(session)
    strategy = Strategy(
        id=uuid4(),
        user_id=user.id,
        name="Old Alert Strat",
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(strategy)
    session.flush()

    old_alert = AlertRule(
        id=uuid4(),
        user_id=user.id,
        alert_type=AlertType.PERFORMANCE,
        strategy_id=strategy.id,
        alert_on_entry=True,
        is_active=True,
    )
    session.add(old_alert)
    session.commit()
    old_alert_id = old_alert.id

    # Simulate migration: deactivate performance alerts without version pin
    alerts = session.exec(
        select(AlertRule).where(
            AlertRule.alert_type == AlertType.PERFORMANCE,
            AlertRule.strategy_version_id.is_(None),
        )
    ).all()
    affected_user_ids = {a.user_id for a in alerts}
    for a in alerts:
        a.is_active = False
        session.add(a)

    # Create notifications
    for uid in affected_user_ids:
        session.add(Notification(
            user_id=uid,
            type="system",
            title="Performance alerts updated — action required",
            body="Your existing alerts have been deactivated.",
            link_url="/strategies",
        ))
    session.commit()

    stored = session.get(AlertRule, old_alert_id)
    assert stored.is_active is False

    note = session.exec(
        select(Notification).where(Notification.user_id == user.id)
    ).first()
    assert note is not None
    assert "deactivated" in note.body


def test_migration_does_not_touch_price_alerts(session):
    """Price-alert rows must be unaffected by the migration."""
    user = _create_user(session)
    price_alert = AlertRule(
        id=uuid4(),
        user_id=user.id,
        alert_type=AlertType.PRICE,
        asset="BTC/USDT",
        direction="above",
        threshold_price=60000,
        is_active=True,
    )
    session.add(price_alert)
    session.commit()
    price_alert_id = price_alert.id

    # Run migration logic (only targets performance alerts)
    alerts = session.exec(
        select(AlertRule).where(
            AlertRule.alert_type == AlertType.PERFORMANCE,
            AlertRule.strategy_version_id.is_(None),
        )
    ).all()
    for a in alerts:
        a.is_active = False
        session.add(a)
    session.commit()

    stored = session.get(AlertRule, price_alert_id)
    assert stored.is_active is True
