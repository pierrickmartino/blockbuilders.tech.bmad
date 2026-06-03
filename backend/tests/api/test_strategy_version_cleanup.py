"""Tests verifying the version-lifecycle cleanup (issue #517).

After this slice:
- PATCH /versions/{n}/archive must not exist (405 or 404)
- GET /versions lists ALL versions (no status filter)
- StrategyVersion has no `status` field
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.core.database import get_session
from app.core.security import hash_password
from app.main import app
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import PlanTier, User, UserTier


@pytest.fixture
def engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def session(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def user(session):
    u = User(
        id=uuid4(),
        email="cleanup517@example.com",
        password_hash=hash_password("TestPassword123!"),
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.BETA,
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


@pytest.fixture
def auth_headers(client, user):
    res = client.post(
        "/auth/login",
        json={"email": user.email, "password": "TestPassword123!"},
    )
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['token']}"}


@pytest.fixture
def strategy(session, user):
    s = Strategy(
        id=uuid4(),
        user_id=user.id,
        name="Cleanup Test Strategy",
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


SAMPLE_DEF = {
    "blocks": [],
    "connections": [],
    "meta": {},
}


# ---------------------------------------------------------------------------
# Slice 1 — StrategyVersion has no status field
# ---------------------------------------------------------------------------


def test_strategy_version_has_no_status_field():
    """StrategyVersion must not expose a status attribute after #517."""
    assert not hasattr(StrategyVersion, "status"), (
        "StrategyVersion.status was not removed — migration or model is stale"
    )


# ---------------------------------------------------------------------------
# Slice 2 — archive endpoint is gone (405 Method Not Allowed or 404)
# ---------------------------------------------------------------------------


def test_archive_endpoint_is_removed(client, auth_headers, strategy, session):
    """PATCH /versions/{n}/archive must return 405 or 404 after removal."""
    v = StrategyVersion(
        strategy_id=strategy.id,
        version_number=1,
        definition_json=SAMPLE_DEF,
    )
    session.add(v)
    session.commit()

    res = client.patch(
        f"/strategies/{strategy.id}/versions/1/archive",
        headers=auth_headers,
    )
    assert res.status_code in (404, 405)


# ---------------------------------------------------------------------------
# Slice 3 — GET /versions returns all versions (no hidden rows)
# ---------------------------------------------------------------------------


def test_list_versions_returns_all_versions(client, auth_headers, strategy, session):
    """GET /versions must return every version row without status filtering."""
    for n in (1, 2, 3):
        v = StrategyVersion(
            strategy_id=strategy.id,
            version_number=n,
            definition_json=SAMPLE_DEF,
        )
        session.add(v)
    session.commit()

    res = client.get(f"/strategies/{strategy.id}/versions", headers=auth_headers)
    assert res.status_code == 200
    version_numbers = {v["version_number"] for v in res.json()}
    assert version_numbers == {1, 2, 3}
