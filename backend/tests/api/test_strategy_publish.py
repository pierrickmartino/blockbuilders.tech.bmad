"""Integration tests for publish flow (issue #459).

Vertical TDD slices — each test covers one observable HTTP behavior.

Endpoints under test:
  POST /strategies/{id}/draft/publish — promote draft to published version
  GET  /strategies/{id}/versions      — must return only PUBLISHED versions
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.core.database import get_session
from app.core.security import hash_password
from app.main import app
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion, VersionStatus
from app.models.user import PlanTier, User, UserTier


# ---------------------------------------------------------------------------
# Fixtures (mirror test_strategy_draft.py for self-containment)
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
        email="publish-test@example.com",
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
        name="Publish Test Strategy",
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


SAMPLE_DEFINITION = {
    "blocks": [
        {
            "id": "price-1",
            "type": "price",
            "label": "Price",
            "position": {"x": 0, "y": 0},
            "params": {},
        },
        {
            "id": "entry-1",
            "type": "entry_signal",
            "label": "Entry Signal",
            "position": {"x": 100, "y": 0},
            "params": {},
        },
        {
            "id": "exit-1",
            "type": "exit_signal",
            "label": "Exit Signal",
            "position": {"x": 200, "y": 0},
            "params": {},
        },
    ],
    "connections": [
        {"from": {"block_id": "price-1", "port": "out"}, "to": {"block_id": "entry-1", "port": "in"}},
        {"from": {"block_id": "price-1", "port": "out"}, "to": {"block_id": "exit-1", "port": "in"}},
    ],
    "meta": {},
}


def _create_draft(client, strategy_id, auth_headers, definition=None):
    """Helper: PUT /draft to seed a draft row."""
    res = client.put(
        f"/strategies/{strategy_id}/draft",
        json={"definition_json": definition or SAMPLE_DEFINITION},
        headers=auth_headers,
    )
    assert res.status_code == 200
    return res.json()


def _create_published_version(session, strategy_id, version_number: int):
    """Helper: directly insert a PUBLISHED version row into the DB."""
    v = StrategyVersion(
        strategy_id=strategy_id,
        version_number=version_number,
        definition_json=SAMPLE_DEFINITION,
        status=VersionStatus.PUBLISHED,
    )
    session.add(v)
    session.commit()
    session.refresh(v)
    return v


# ---------------------------------------------------------------------------
# Slice B1 — POST /draft/publish returns 404 when no draft exists
# ---------------------------------------------------------------------------


def test_publish_returns_404_when_no_draft(client, auth_headers, strategy):
    """POST /strategies/{id}/draft/publish must return 404 if no draft row exists."""
    res = client.post(
        f"/strategies/{strategy.id}/draft/publish", headers=auth_headers
    )
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Slice B2 — POST /draft/publish assigns version_number=1 when no published versions
# ---------------------------------------------------------------------------


def test_publish_assigns_version_number_1_on_first_publish(
    client, auth_headers, strategy
):
    """First publish should create version_number=1 from the draft."""
    _create_draft(client, strategy.id, auth_headers)

    res = client.post(
        f"/strategies/{strategy.id}/draft/publish", headers=auth_headers
    )

    assert res.status_code == 200
    body = res.json()
    assert body["version_number"] == 1
    assert "id" in body
    assert "created_at" in body


# ---------------------------------------------------------------------------
# Slice B3 — POST /draft/publish assigns max+1 when published versions exist
# ---------------------------------------------------------------------------


def test_publish_assigns_sequential_version_number(
    client, auth_headers, strategy, session
):
    """Publish when one published version already exists must yield version_number=2."""
    _create_published_version(session, strategy.id, version_number=1)
    _create_draft(client, strategy.id, auth_headers)

    res = client.post(
        f"/strategies/{strategy.id}/draft/publish", headers=auth_headers
    )

    assert res.status_code == 200
    assert res.json()["version_number"] == 2


# ---------------------------------------------------------------------------
# Slice B4 — After publish, GET /draft returns 404 (no draft remains)
# ---------------------------------------------------------------------------


def test_publish_removes_draft(client, auth_headers, strategy):
    """After a successful publish, GET /draft must return 404."""
    _create_draft(client, strategy.id, auth_headers)

    client.post(f"/strategies/{strategy.id}/draft/publish", headers=auth_headers)

    draft_res = client.get(f"/strategies/{strategy.id}/draft", headers=auth_headers)
    assert draft_res.status_code == 404


# ---------------------------------------------------------------------------
# Slice B5 — GET /versions returns only PUBLISHED versions
# ---------------------------------------------------------------------------


def test_list_versions_excludes_draft(client, auth_headers, strategy, session):
    """GET /versions must not include the draft row (version_number=0, status=draft)."""
    # Seed one published version and one draft
    _create_published_version(session, strategy.id, version_number=1)
    _create_draft(client, strategy.id, auth_headers)

    res = client.get(f"/strategies/{strategy.id}/versions", headers=auth_headers)

    assert res.status_code == 200
    body = res.json()
    # Only the published version should appear
    assert len(body) == 1
    assert body[0]["version_number"] == 1


def test_list_versions_returns_empty_when_no_published(
    client, auth_headers, strategy
):
    """GET /versions returns [] when only a draft exists (no published versions)."""
    _create_draft(client, strategy.id, auth_headers)

    res = client.get(f"/strategies/{strategy.id}/versions", headers=auth_headers)

    assert res.status_code == 200
    assert res.json() == []
