"""Backend integration tests for persisting Strategy.entry_path (#556).

ADR-0009 makes `entry_path` a real, persisted fact stamped once at creation
by each of the four creation routes — the foundation every downstream cohort
read depends on. These tests assert each route persists the value the issue
specifies, that paths which don't stamp it read `null` (never a guess), and
that the dedicated clone route's value cannot be spoofed through the shared
create endpoint.
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
from app.models.strategy_template import StrategyTemplate
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
        email="entry-path-test@example.com",
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
def template(session):
    t = StrategyTemplate(
        id=uuid4(),
        name="SMA Crossover",
        description="desc",
        logic_summary="logic",
        use_cases=["trend"],
        parameter_ranges={"period": "10-50"},
        definition_json={"blocks": [], "connections": []},
        asset="BTC/USDT",
        timeframe="1d",
        status="published",
    )
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

CREATE_PAYLOAD = {"name": "My Strategy", "asset": "BTC/USDT", "timeframe": "1d"}


def test_blank_canvas_create_persists_blank_canvas_entry_path(client, auth_headers):
    """The "new strategy" modal stamps `entry_path: blank_canvas`."""
    res = client.post(
        "/strategies/",
        json={**CREATE_PAYLOAD, "entry_path": "blank_canvas"},
        headers=auth_headers,
    )
    assert res.status_code == 201
    assert res.json()["entry_path"] == "blank_canvas"


def test_wizard_create_persists_wizard_entry_path(client, auth_headers):
    """The strategy wizard stamps `entry_path: wizard`."""
    res = client.post(
        "/strategies/",
        json={**CREATE_PAYLOAD, "entry_path": "wizard"},
        headers=auth_headers,
    )
    assert res.status_code == 201
    assert res.json()["entry_path"] == "wizard"


def test_create_without_entry_path_persists_null(client, auth_headers):
    """A code path that doesn't stamp a value (e.g. JSON import) reads `null`,
    never a guessed value."""
    res = client.post("/strategies/", json=CREATE_PAYLOAD, headers=auth_headers)
    assert res.status_code == 201
    assert res.json()["entry_path"] is None


def test_template_clone_persists_template_clone_entry_path(client, auth_headers, template):
    """Cloning a template stamps `entry_path: template_clone` unconditionally —
    the route needs no client input to know its own provenance."""
    res = client.post(f"/strategy-templates/{template.id}/clone", headers=auth_headers)
    assert res.status_code == 201
    assert res.json()["entry_path"] == "template_clone"


def test_create_accepts_nl_wedge_entry_path(client, auth_headers):
    """The shared create endpoint persists `nl_wedge` — the value the NL wedge
    (ACTIONS #4-6) will stamp once it ships, reusing this exact creation flow
    per ADR-0006 ("a draft creates a new strategy... exactly like the
    wizard's existing path")."""
    res = client.post(
        "/strategies/",
        json={**CREATE_PAYLOAD, "entry_path": "nl_wedge"},
        headers=auth_headers,
    )
    assert res.status_code == 201
    assert res.json()["entry_path"] == "nl_wedge"


def test_create_rejects_template_clone_entry_path(client, auth_headers):
    """`template_clone` is stamped exclusively by the dedicated clone route —
    a client cannot claim it through the shared create endpoint."""
    res = client.post(
        "/strategies/",
        json={**CREATE_PAYLOAD, "entry_path": "template_clone"},
        headers=auth_headers,
    )
    assert res.status_code == 422
