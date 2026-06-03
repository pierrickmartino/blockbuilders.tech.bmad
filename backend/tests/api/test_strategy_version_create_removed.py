"""Regression test — POST /strategies/{id}/versions endpoint is removed (issue #463).

The create-version route was the old autosave path (useAutosave hook).  It has
been superseded by the draft/publish lifecycle:
  PUT  /strategies/{id}/draft          → persist draft
  POST /strategies/{id}/draft/publish  → promote draft to published version

After removal the POST method on the /versions path must return 405 so that any
stale client code fails loudly rather than silently.
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
from app.models.user import PlanTier, User, UserTier


# ---------------------------------------------------------------------------
# Fixtures (self-contained)
# ---------------------------------------------------------------------------


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
    with Session(engine) as s:
        yield s


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
        email="version-create-removed@example.com",
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
        name="Removal Test Strategy",
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


# ---------------------------------------------------------------------------
# Sample payload (would have been accepted by the old endpoint)
# ---------------------------------------------------------------------------

SAMPLE_DEFINITION = {
    "blocks": [
        {"id": "price-1", "type": "price", "label": "Price", "position": {"x": 0, "y": 0}, "params": {}},
        {"id": "entry-1", "type": "entry_signal", "label": "Entry", "position": {"x": 100, "y": 0}, "params": {}},
        {"id": "exit-1", "type": "exit_signal", "label": "Exit", "position": {"x": 200, "y": 0}, "params": {}},
    ],
    "connections": [
        {"from": {"block_id": "price-1", "port": "out"}, "to": {"block_id": "entry-1", "port": "in"}},
        {"from": {"block_id": "price-1", "port": "out"}, "to": {"block_id": "exit-1", "port": "in"}},
    ],
    "meta": {},
}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_post_create_version_returns_405(client, strategy, auth_headers):
    """POST /strategies/{id}/versions must be gone — endpoint was the old autosave path."""
    res = client.post(
        f"/strategies/{strategy.id}/versions",
        json={"definition": SAMPLE_DEFINITION},
        headers=auth_headers,
    )
    assert res.status_code == 405, (
        f"Expected 405 Method Not Allowed after endpoint removal, got {res.status_code}. "
        "The POST /versions endpoint must be fully removed."
    )


def test_get_versions_still_works(client, strategy, auth_headers):
    """GET /strategies/{id}/versions must remain intact — only POST is removed."""
    res = client.get(f"/strategies/{strategy.id}/versions", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)
