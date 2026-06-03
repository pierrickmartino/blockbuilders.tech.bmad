"""Integration tests for draft persist endpoints (issue #458).

Vertical TDD slices — each test covers one observable HTTP behavior.

Endpoints under test:
  GET  /strategies/{id}/draft  — return current draft or 404
  PUT  /strategies/{id}/draft  — upsert single draft row
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
# Fixtures
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
        email="draft-test@example.com",
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
        name="Draft Test Strategy",
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
            "id": "block-1",
            "type": "price",
            "label": "Price",
            "position": {"x": 0, "y": 0},
            "params": {},
        }
    ],
    "connections": [],
    "meta": {},
}


# ---------------------------------------------------------------------------
# Slice B1 — GET /draft returns 404 when no draft exists
# ---------------------------------------------------------------------------


def test_get_draft_returns_404_when_no_draft(client, auth_headers, strategy):
    """GET /strategies/{id}/draft must return 404 if no draft row exists."""
    res = client.get(f"/strategies/{strategy.id}/draft", headers=auth_headers)
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Slice B2 — PUT /draft creates a new StrategyVersion with status=draft
# ---------------------------------------------------------------------------


def test_put_draft_creates_new_draft_row(client, auth_headers, strategy, session):
    """First PUT /draft must create a StrategyVersion with status='draft'."""
    res = client.put(
        f"/strategies/{strategy.id}/draft",
        json={"definition_json": SAMPLE_DEFINITION},
        headers=auth_headers,
    )

    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "draft"
    assert body["definition_json"] == SAMPLE_DEFINITION

    # Verify persisted to DB
    versions = session.execute(
        select(StrategyVersion).where(StrategyVersion.strategy_id == strategy.id)
    ).scalars().all()
    assert len(versions) == 1
    assert versions[0].status == VersionStatus.DRAFT


# ---------------------------------------------------------------------------
# Slice B3 — GET /draft returns the draft after creation
# ---------------------------------------------------------------------------


def test_get_draft_returns_draft_after_creation(client, auth_headers, strategy):
    """GET /strategies/{id}/draft returns 200 + draft body once a draft exists."""
    client.put(
        f"/strategies/{strategy.id}/draft",
        json={"definition_json": SAMPLE_DEFINITION},
        headers=auth_headers,
    )

    res = client.get(f"/strategies/{strategy.id}/draft", headers=auth_headers)

    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "draft"
    assert body["definition_json"] == SAMPLE_DEFINITION
    assert "id" in body
    assert "version_number" in body
    assert "created_at" in body


# ---------------------------------------------------------------------------
# Slice B4 — PUT /draft updates definition_json on subsequent calls (upsert)
# ---------------------------------------------------------------------------


def test_put_draft_updates_existing_draft(client, auth_headers, strategy, session):
    """Second PUT /draft must update definition_json in-place, not create a new row."""
    first_definition = {"blocks": [], "connections": [], "meta": {"v": 1}}
    second_definition = {"blocks": [], "connections": [], "meta": {"v": 2}}

    client.put(
        f"/strategies/{strategy.id}/draft",
        json={"definition_json": first_definition},
        headers=auth_headers,
    )
    res = client.put(
        f"/strategies/{strategy.id}/draft",
        json={"definition_json": second_definition},
        headers=auth_headers,
    )

    assert res.status_code == 200
    assert res.json()["definition_json"] == second_definition

    # Still only one draft row
    versions = session.execute(
        select(StrategyVersion).where(StrategyVersion.strategy_id == strategy.id)
    ).scalars().all()
    assert len(versions) == 1
    assert versions[0].definition_json == second_definition


# ---------------------------------------------------------------------------
# Slice B5 — PUT /draft is idempotent
# ---------------------------------------------------------------------------


def test_put_draft_is_idempotent(client, auth_headers, strategy, session):
    """Two identical PUT /draft calls must produce the same result and same row count."""
    payload = {"definition_json": SAMPLE_DEFINITION}

    res1 = client.put(
        f"/strategies/{strategy.id}/draft", json=payload, headers=auth_headers
    )
    res2 = client.put(
        f"/strategies/{strategy.id}/draft", json=payload, headers=auth_headers
    )

    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json()["definition_json"] == res2.json()["definition_json"]

    count = session.execute(
        select(StrategyVersion).where(StrategyVersion.strategy_id == strategy.id)
    ).scalars().all()
    assert len(count) == 1


# ---------------------------------------------------------------------------
# Slice B6 — Only one draft exists at any time
# ---------------------------------------------------------------------------


def test_only_one_draft_exists_after_multiple_puts(
    client, auth_headers, strategy, session
):
    """Three consecutive PUTs must leave exactly one draft row."""
    for i in range(3):
        client.put(
            f"/strategies/{strategy.id}/draft",
            json={"definition_json": {"blocks": [], "connections": [], "meta": {"i": i}}},
            headers=auth_headers,
        )

    drafts = session.execute(
        select(StrategyVersion).where(
            StrategyVersion.strategy_id == strategy.id,
            StrategyVersion.status == VersionStatus.DRAFT,
        )
    ).scalars().all()
    assert len(drafts) == 1


# ---------------------------------------------------------------------------
# Slice B7 — Draft endpoints respect strategy ownership
# ---------------------------------------------------------------------------


def test_get_draft_returns_404_for_other_users_strategy(client, session, strategy):
    """GET /draft on another user's strategy must return 404 (ownership enforced)."""
    other_user = User(
        id=uuid4(),
        email="other@example.com",
        password_hash=hash_password("OtherPassword123!"),
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.BETA,
    )
    session.add(other_user)
    session.commit()

    login = client.post(
        "/auth/login",
        json={"email": "other@example.com", "password": "OtherPassword123!"},
    )
    other_headers = {"Authorization": f"Bearer {login.json()['token']}"}

    res = client.get(f"/strategies/{strategy.id}/draft", headers=other_headers)
    assert res.status_code == 404
