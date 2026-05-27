"""Integration tests for draft validate + publish gate (issue #460).

Vertical TDD slices — each test covers one observable HTTP behavior.

Endpoints under test:
  POST /strategies/{id}/draft/validate   — read-only validation of current draft
  POST /strategies/{id}/draft/publish    — now requires valid draft (422 gate)
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
        email="validate-test@example.com",
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
        name="Validate Test Strategy",
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


# A definition missing entry/exit signals — will fail validation.
INVALID_DEFINITION = {
    "blocks": [
        {
            "id": "price-1",
            "type": "price",
            "label": "Price",
            "position": {"x": 0, "y": 0},
            "params": {},
        }
    ],
    "connections": [],
    "meta": {},
}

# A definition with entry + exit signals both connected — passes all checks.
VALID_DEFINITION = {
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
        json={"definition_json": definition or INVALID_DEFINITION},
        headers=auth_headers,
    )
    assert res.status_code == 200
    return res.json()


# ---------------------------------------------------------------------------
# Slice V1 — POST /draft/validate returns errors for an invalid draft
# ---------------------------------------------------------------------------


def test_draft_validate_returns_errors_for_invalid_draft(client, auth_headers, strategy):
    """POST /draft/validate must return status='invalid' and non-empty errors list."""
    _create_draft(client, strategy.id, auth_headers, INVALID_DEFINITION)

    res = client.post(
        f"/strategies/{strategy.id}/draft/validate", headers=auth_headers
    )

    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "invalid"
    assert len(body["errors"]) > 0
    # Errors must have required fields
    for error in body["errors"]:
        assert "code" in error
        assert "message" in error


# ---------------------------------------------------------------------------
# Slice V2 — POST /draft/validate returns clean result for a valid draft
# ---------------------------------------------------------------------------


def test_draft_validate_returns_clean_for_valid_draft(client, auth_headers, strategy):
    """POST /draft/validate must return status='valid' and empty errors list."""
    _create_draft(client, strategy.id, auth_headers, VALID_DEFINITION)

    res = client.post(
        f"/strategies/{strategy.id}/draft/validate", headers=auth_headers
    )

    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "valid"
    assert body["errors"] == []


# ---------------------------------------------------------------------------
# Slice V3 — POST /draft/validate returns 404 when no draft exists
# ---------------------------------------------------------------------------


def test_draft_validate_returns_404_when_no_draft(client, auth_headers, strategy):
    """POST /draft/validate must return 404 if no draft row exists for this strategy."""
    res = client.post(
        f"/strategies/{strategy.id}/draft/validate", headers=auth_headers
    )

    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Slice V4 — POST /draft/publish returns 422 when draft is invalid
# ---------------------------------------------------------------------------


def test_publish_rejects_invalid_draft(client, auth_headers, strategy):
    """POST /draft/publish must return 422 with validation errors if draft is invalid."""
    _create_draft(client, strategy.id, auth_headers, INVALID_DEFINITION)

    res = client.post(
        f"/strategies/{strategy.id}/draft/publish", headers=auth_headers
    )

    assert res.status_code == 422
    body = res.json()
    # FastAPI wraps HTTPException.detail under the "detail" key.
    detail = body["detail"]
    assert detail["status"] == "invalid"
    assert len(detail["errors"]) > 0


# ---------------------------------------------------------------------------
# Slice V5 — POST /draft/publish succeeds when draft is valid
# ---------------------------------------------------------------------------


def test_publish_succeeds_for_valid_draft(client, auth_headers, strategy):
    """POST /draft/publish must still return 200 when the draft passes validation."""
    _create_draft(client, strategy.id, auth_headers, VALID_DEFINITION)

    res = client.post(
        f"/strategies/{strategy.id}/draft/publish", headers=auth_headers
    )

    assert res.status_code == 200
    body = res.json()
    assert body["version_number"] == 1
    assert "id" in body
    assert "created_at" in body
