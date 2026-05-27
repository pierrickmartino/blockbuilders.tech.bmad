"""Integration tests for archive version flow (issue #461).

Vertical TDD slices — each test covers one observable HTTP behavior.

Endpoint under test:
  PATCH /strategies/{id}/versions/{version_number}/archive
    — set status = 'archived' on a published version
    — return 404 for non-existent / non-published versions
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
# Fixtures (mirror test_strategy_publish.py for self-containment)
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
        email="archive-test@example.com",
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
        name="Archive Test Strategy",
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


SAMPLE_DEFINITION = {
    "blocks": [
        {"id": "price-1", "type": "price", "label": "Price",
         "position": {"x": 0, "y": 0}, "params": {}},
        {"id": "entry-1", "type": "entry_signal", "label": "Entry Signal",
         "position": {"x": 100, "y": 0}, "params": {}},
        {"id": "exit-1", "type": "exit_signal", "label": "Exit Signal",
         "position": {"x": 200, "y": 0}, "params": {}},
    ],
    "connections": [
        {"from": {"block_id": "price-1", "port": "out"}, "to": {"block_id": "entry-1", "port": "in"}},
        {"from": {"block_id": "price-1", "port": "out"}, "to": {"block_id": "exit-1", "port": "in"}},
    ],
    "meta": {},
}


def _create_published_version(session, strategy_id, version_number: int) -> StrategyVersion:
    """Seed a PUBLISHED version row directly in the DB."""
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


def _create_draft(session, strategy_id) -> StrategyVersion:
    """Seed a DRAFT version row directly in the DB."""
    v = StrategyVersion(
        strategy_id=strategy_id,
        version_number=0,
        definition_json=SAMPLE_DEFINITION,
        status=VersionStatus.DRAFT,
    )
    session.add(v)
    session.commit()
    session.refresh(v)
    return v


# ---------------------------------------------------------------------------
# Slice A1 — PATCH archive sets status to archived and returns version fields
# ---------------------------------------------------------------------------


def test_archive_published_version_returns_200(client, auth_headers, strategy, session):
    """PATCH /versions/{n}/archive on a published version must return 200
    with id, version_number, and created_at."""
    _create_published_version(session, strategy.id, version_number=1)

    res = client.patch(
        f"/strategies/{strategy.id}/versions/1/archive",
        headers=auth_headers,
    )

    assert res.status_code == 200
    body = res.json()
    assert body["version_number"] == 1
    assert "id" in body
    assert "created_at" in body


def test_archive_sets_status_to_archived_in_db(client, auth_headers, strategy, session):
    """After a successful PATCH archive the row's status must be ARCHIVED."""
    v = _create_published_version(session, strategy.id, version_number=1)

    client.patch(
        f"/strategies/{strategy.id}/versions/1/archive",
        headers=auth_headers,
    )

    session.refresh(v)
    assert v.status == VersionStatus.ARCHIVED


# ---------------------------------------------------------------------------
# Slice A2 — Archived version excluded from GET /versions list
# ---------------------------------------------------------------------------


def test_archived_version_excluded_from_list(client, auth_headers, strategy, session):
    """After archiving, GET /versions must not include the archived row."""
    _create_published_version(session, strategy.id, version_number=1)
    _create_published_version(session, strategy.id, version_number=2)

    # Archive version 1
    client.patch(
        f"/strategies/{strategy.id}/versions/1/archive",
        headers=auth_headers,
    )

    res = client.get(f"/strategies/{strategy.id}/versions", headers=auth_headers)
    assert res.status_code == 200
    version_numbers = [v["version_number"] for v in res.json()]
    assert 1 not in version_numbers
    assert 2 in version_numbers


# ---------------------------------------------------------------------------
# Slice A3 — Archive non-existent version returns 404
# ---------------------------------------------------------------------------


def test_archive_nonexistent_version_returns_404(client, auth_headers, strategy):
    """PATCH /versions/99/archive must return 404 when version doesn't exist."""
    res = client.patch(
        f"/strategies/{strategy.id}/versions/99/archive",
        headers=auth_headers,
    )

    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Slice A4 — Cannot archive drafts or already-archived versions (both → 404)
# ---------------------------------------------------------------------------


def test_archive_draft_version_returns_404(client, auth_headers, strategy, session):
    """PATCH .../versions/0/archive must return 404 — drafts cannot be archived."""
    _create_draft(session, strategy.id)

    res = client.patch(
        f"/strategies/{strategy.id}/versions/0/archive",
        headers=auth_headers,
    )

    assert res.status_code == 404


def test_archive_already_archived_version_returns_404(
    client, auth_headers, strategy, session
):
    """Archiving an already-archived version must return 404."""
    _create_published_version(session, strategy.id, version_number=1)

    # First archive
    client.patch(
        f"/strategies/{strategy.id}/versions/1/archive",
        headers=auth_headers,
    )

    # Second archive attempt
    res = client.patch(
        f"/strategies/{strategy.id}/versions/1/archive",
        headers=auth_headers,
    )

    assert res.status_code == 404
