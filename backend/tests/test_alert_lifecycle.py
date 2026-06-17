"""Tests for alert lifecycle: re-pin, stale surfacing, archive/delete.

Covers:
- Creating from a newer run re-pins the existing alert (no 409 accumulation)
- Working-copy edit never moves the pin
- Stale indicator when pinned version < latest version
- Archive strategy deactivates alert; un-archive does NOT reactivate
- Delete strategy cascades to remove alert
"""
import os
from datetime import datetime, timezone
from uuid import uuid4

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


def _seed_strategy(session: Session, user_id) -> Strategy:
    strategy = Strategy(
        id=uuid4(),
        user_id=user_id,
        name="Lifecycle Test",
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(strategy)
    session.commit()
    session.refresh(strategy)
    return strategy


def _add_version_and_run(session, user_id, strategy_id, version_number: int):
    version = StrategyVersion(
        id=uuid4(),
        strategy_id=strategy_id,
        version_number=version_number,
        definition_json={"blocks": [], "connections": []},
    )
    session.add(version)
    run = BacktestRun(
        id=uuid4(),
        user_id=user_id,
        strategy_id=strategy_id,
        strategy_version_id=version.id,
        status="completed",
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2025, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2025, 6, 1, tzinfo=timezone.utc),
        triggered_by="manual",
    )
    session.add(run)
    session.commit()
    return version, run


# ── RED→GREEN 1: re-pin replaces existing alert ───────────────────────────────

def test_repin_replaces_existing_alert_not_accumulate(session, client):
    user = _create_user(session)
    strategy = _seed_strategy(session, user.id)
    v1, run1 = _add_version_and_run(session, user.id, strategy.id, version_number=1)
    v2, run2 = _add_version_and_run(session, user.id, strategy.id, version_number=2)
    token = _jwt(client, user.email)

    # Create alert pinned to v1
    resp1 = client.post(
        "/alerts/",
        json={"alert_type": "performance", "backtest_run_id": str(run1.id), "alert_on_entry": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp1.status_code == 201, resp1.text
    alert_id = resp1.json()["id"]

    # Re-pin from run2 (v2) — must replace, not raise 409
    resp2 = client.post(
        "/alerts/",
        json={"alert_type": "performance", "backtest_run_id": str(run2.id), "alert_on_entry": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 200, resp2.text
    body = resp2.json()
    assert body["strategy_version_id"] == str(v2.id), "pin must move to v2"
    assert body["id"] == alert_id, "same alert row, not a new one"

    # Exactly one active performance alert for this strategy
    active = session.exec(
        select(AlertRule).where(
            AlertRule.strategy_id == strategy.id,
            AlertRule.alert_type == AlertType.PERFORMANCE,
            AlertRule.is_active == True,  # noqa: E712
        )
    ).all()
    assert len(active) == 1


# ── RED→GREEN 2: working-copy edit never moves the pin ────────────────────────

def test_working_copy_edit_does_not_change_pin(session, client):
    user = _create_user(session)
    strategy = _seed_strategy(session, user.id)
    v1, run1 = _add_version_and_run(session, user.id, strategy.id, version_number=1)
    token = _jwt(client, user.email)

    resp = client.post(
        "/alerts/",
        json={"alert_type": "performance", "backtest_run_id": str(run1.id), "alert_on_entry": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    alert_id = resp.json()["id"]
    pinned_version_id = resp.json()["strategy_version_id"]

    # Edit working copy
    client.put(
        f"/strategies/{strategy.id}/draft",
        json={"definition_json": {"blocks": [], "connections": []}},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Pin must be unchanged
    from uuid import UUID
    alert = session.get(AlertRule, UUID(alert_id))
    assert str(alert.strategy_version_id) == pinned_version_id


# ── RED→GREEN 3: stale indicator ──────────────────────────────────────────────

def test_alert_is_stale_when_newer_version_exists(session, client):
    user = _create_user(session)
    strategy = _seed_strategy(session, user.id)
    v1, run1 = _add_version_and_run(session, user.id, strategy.id, version_number=1)
    token = _jwt(client, user.email)

    # Create alert pinned to v1
    client.post(
        "/alerts/",
        json={"alert_type": "performance", "backtest_run_id": str(run1.id), "alert_on_entry": True},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Simulate a strategy change that froze a new version
    v2 = StrategyVersion(
        id=uuid4(),
        strategy_id=strategy.id,
        version_number=2,
        definition_json={"blocks": [], "connections": []},
    )
    session.add(v2)
    session.commit()

    resp = client.get("/alerts/", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    alerts = resp.json()
    assert len(alerts) == 1
    assert alerts[0]["is_stale"] is True


def test_alert_is_not_stale_when_pinned_to_latest_version(session, client):
    user = _create_user(session)
    strategy = _seed_strategy(session, user.id)
    v1, run1 = _add_version_and_run(session, user.id, strategy.id, version_number=1)
    token = _jwt(client, user.email)

    client.post(
        "/alerts/",
        json={"alert_type": "performance", "backtest_run_id": str(run1.id), "alert_on_entry": True},
        headers={"Authorization": f"Bearer {token}"},
    )

    resp = client.get("/alerts/", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    alerts = resp.json()
    assert alerts[0]["is_stale"] is False


# ── RED→GREEN 4: archive deactivates; un-archive does not reactivate ──────────

def test_archive_strategy_deactivates_alert(session, client):
    user = _create_user(session)
    strategy = _seed_strategy(session, user.id)
    v1, run1 = _add_version_and_run(session, user.id, strategy.id, version_number=1)
    token = _jwt(client, user.email)

    resp = client.post(
        "/alerts/",
        json={"alert_type": "performance", "backtest_run_id": str(run1.id), "alert_on_entry": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    alert_id = resp.json()["id"]

    client.patch(
        f"/strategies/{strategy.id}",
        json={"is_archived": True},
        headers={"Authorization": f"Bearer {token}"},
    )

    session.expire_all()
    from uuid import UUID
    alert = session.get(AlertRule, UUID(alert_id))
    assert alert.is_active is False


def test_unarchive_strategy_does_not_reactivate_alert(session, client):
    user = _create_user(session)
    strategy = _seed_strategy(session, user.id)
    v1, run1 = _add_version_and_run(session, user.id, strategy.id, version_number=1)
    token = _jwt(client, user.email)

    resp = client.post(
        "/alerts/",
        json={"alert_type": "performance", "backtest_run_id": str(run1.id), "alert_on_entry": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    alert_id = resp.json()["id"]

    # Archive then un-archive
    client.patch(
        f"/strategies/{strategy.id}",
        json={"is_archived": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    client.patch(
        f"/strategies/{strategy.id}",
        json={"is_archived": False},
        headers={"Authorization": f"Bearer {token}"},
    )

    session.expire_all()
    from uuid import UUID
    alert = session.get(AlertRule, UUID(alert_id))
    assert alert.is_active is False  # must NOT auto-reactivate


# ── RED→GREEN 5: delete strategy cascades to remove alert ─────────────────────

def test_delete_strategy_removes_alert(session, client):
    user = _create_user(session)
    strategy = _seed_strategy(session, user.id)
    v1, run1 = _add_version_and_run(session, user.id, strategy.id, version_number=1)
    token = _jwt(client, user.email)

    resp = client.post(
        "/alerts/",
        json={"alert_type": "performance", "backtest_run_id": str(run1.id), "alert_on_entry": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    alert_id = resp.json()["id"]

    client.delete(
        f"/strategies/{strategy.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    session.expire_all()
    from uuid import UUID
    alert = session.get(AlertRule, UUID(alert_id))
    assert alert is None
