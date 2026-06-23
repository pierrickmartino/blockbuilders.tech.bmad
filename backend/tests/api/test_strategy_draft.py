"""Integration tests for working-copy endpoints (issue #514).

Replaces the old draft tests (issue #458) that tested version_number=0 rows.
Per ADR-0005: GET never 404s for an owned strategy; the working copy is always
present (eagerly created at strategy creation).

Endpoints under test:
  GET  /strategies/{id}/draft  — always returns the working copy (never 404)
  PUT  /strategies/{id}/draft  — upserts the working copy (no validation gate)
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
from app.models.strategy_draft import StrategyDraft
from app.models.user import PlanTier, User, UserTier
import app.services.working_copy as working_copy
from app.services.working_copy import DEFAULT_DEFINITION


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
    # Reflect the real invariant: working copy is eagerly created at strategy creation.
    # Tests that bypass POST /strategies/ must mirror what the route does.
    working_copy.create(s, session)
    session.commit()
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
# Slice D1 — GET /draft returns working copy after strategy creation
#            (the working copy is eagerly created by POST /strategies/)
# ---------------------------------------------------------------------------


def test_get_draft_returns_working_copy_after_strategy_creation(
    client, auth_headers, session
):
    """GET /draft must return 200 immediately after creating a strategy via the API.

    The working copy is eagerly seeded with the default definition.
    No PUT is required first.
    """
    create_res = client.post(
        "/strategies/",
        json={"name": "My Strategy", "asset": "BTC/USDT", "timeframe": "1d"},
        headers=auth_headers,
    )
    assert create_res.status_code == 201
    strategy_id = create_res.json()["id"]

    res = client.get(f"/strategies/{strategy_id}/draft", headers=auth_headers)

    assert res.status_code == 200
    body = res.json()
    assert body["definition_json"] == DEFAULT_DEFINITION
    assert "strategy_id" in body
    assert "updated_at" in body


# ---------------------------------------------------------------------------
# Slice D2 — GET /draft never 404s for an owned strategy even with no PUT
# ---------------------------------------------------------------------------


def test_get_draft_never_404s_for_owned_strategy(client, auth_headers, strategy, session):
    """GET /draft on an owned strategy with no prior PUT must return 200.

    The working copy always exists — get_or_create creates it on first GET.
    """
    res = client.get(f"/strategies/{strategy.id}/draft", headers=auth_headers)

    assert res.status_code == 200
    body = res.json()
    assert body["definition_json"] == DEFAULT_DEFINITION


# ---------------------------------------------------------------------------
# Slice D3 — PUT /draft upserts the working copy
# ---------------------------------------------------------------------------


def test_put_draft_upserts_working_copy(client, auth_headers, strategy, session):
    """PUT /draft must persist the new definition_json and return it."""
    res = client.put(
        f"/strategies/{strategy.id}/draft",
        json={"definition_json": SAMPLE_DEFINITION},
        headers=auth_headers,
    )

    assert res.status_code == 200
    body = res.json()
    assert body["definition_json"] == SAMPLE_DEFINITION

    # Exactly one row in strategy_drafts
    rows = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).all()
    assert len(rows) == 1
    assert rows[0].definition_json == SAMPLE_DEFINITION


# ---------------------------------------------------------------------------
# Slice D4 — Second PUT updates definition_json without creating a new row
# ---------------------------------------------------------------------------


def test_put_draft_updates_without_duplicate_row(client, auth_headers, strategy, session):
    """Two consecutive PUTs must leave exactly one row with the latest definition."""
    first = {"blocks": [], "connections": [], "meta": {"v": 1}}
    second = {"blocks": [], "connections": [], "meta": {"v": 2}}

    client.put(
        f"/strategies/{strategy.id}/draft",
        json={"definition_json": first},
        headers=auth_headers,
    )
    res = client.put(
        f"/strategies/{strategy.id}/draft",
        json={"definition_json": second},
        headers=auth_headers,
    )

    assert res.status_code == 200
    assert res.json()["definition_json"] == second

    rows = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).all()
    assert len(rows) == 1
    assert rows[0].definition_json == second


# ---------------------------------------------------------------------------
# Slice D5 — GET /draft returns updated definition after PUT
# ---------------------------------------------------------------------------


def test_get_draft_returns_updated_definition_after_put(
    client, auth_headers, strategy
):
    """GET after PUT must return the updated definition, not the default."""
    client.put(
        f"/strategies/{strategy.id}/draft",
        json={"definition_json": SAMPLE_DEFINITION},
        headers=auth_headers,
    )

    res = client.get(f"/strategies/{strategy.id}/draft", headers=auth_headers)

    assert res.status_code == 200
    assert res.json()["definition_json"] == SAMPLE_DEFINITION


# ---------------------------------------------------------------------------
# Slice D6 — Draft endpoints respect strategy ownership
# ---------------------------------------------------------------------------


def test_get_draft_returns_404_for_other_users_strategy(client, session, strategy):
    """GET /draft on another user's strategy must return 404."""
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


# ---------------------------------------------------------------------------
# Slice D7 — POST /draft/validate validates the persisted working copy
#            (regression: route must stay registered; the editor calls it
#             after every autosave for live validation feedback)
# ---------------------------------------------------------------------------


def test_validate_draft_route_is_registered(client, auth_headers, strategy):
    """POST /draft/validate must resolve to a real endpoint (not 404/405).

    The default empty working copy is invalid, so it returns 200 + errors.
    """
    res = client.post(
        f"/strategies/{strategy.id}/draft/validate", headers=auth_headers
    )

    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "invalid"
    codes = {err["code"] for err in body["errors"]}
    assert "MISSING_ENTRY" in codes
    assert "MISSING_EXIT" in codes


def test_validate_draft_reflects_latest_put(client, auth_headers, strategy):
    """Validation must run against the most recently persisted draft."""
    client.put(
        f"/strategies/{strategy.id}/draft",
        json={"definition_json": SAMPLE_DEFINITION},
        headers=auth_headers,
    )

    res = client.post(
        f"/strategies/{strategy.id}/draft/validate", headers=auth_headers
    )

    assert res.status_code == 200
    # SAMPLE_DEFINITION has a single unconnected price block — still invalid,
    # but proves validation read the PUT'd definition, not the empty default.
    assert res.json()["status"] == "invalid"


def test_validate_draft_returns_404_for_other_users_strategy(client, session, strategy):
    """POST /draft/validate on another user's strategy must return 404."""
    other_user = User(
        id=uuid4(),
        email="validate-other@example.com",
        password_hash=hash_password("OtherPassword123!"),
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.BETA,
    )
    session.add(other_user)
    session.commit()

    login = client.post(
        "/auth/login",
        json={"email": "validate-other@example.com", "password": "OtherPassword123!"},
    )
    other_headers = {"Authorization": f"Bearer {login.json()['token']}"}

    res = client.post(
        f"/strategies/{strategy.id}/draft/validate", headers=other_headers
    )
    assert res.status_code == 404
