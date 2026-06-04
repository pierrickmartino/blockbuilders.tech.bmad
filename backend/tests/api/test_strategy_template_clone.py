"""Regression tests for cloning a strategy template (POST /strategy-templates/{id}/clone).

Bug: cloning a template produced an empty strategy. The endpoint wrote the
template definition into a StrategyVersion, but the editor reads from the
working copy (strategy_drafts) per ADR-0005, which was never seeded — so the
canvas opened blank.

These tests assert the cloned strategy's working copy carries the template's
definition, i.e. GET /draft returns the template blocks (not the empty default).
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
        email="clone-test@example.com",
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


TEMPLATE_DEFINITION = {
    "blocks": [
        {
            "id": "price-1",
            "type": "price",
            "label": "Price",
            "position": {"x": 0, "y": 0},
            "params": {},
        },
        {
            "id": "sma-1",
            "type": "sma",
            "label": "SMA",
            "position": {"x": 200, "y": 0},
            "params": {"period": 20},
        },
    ],
    "connections": [{"source": "price-1", "target": "sma-1"}],
    "meta": {"templated": True},
}


@pytest.fixture
def template(session):
    t = StrategyTemplate(
        id=uuid4(),
        name="SMA Crossover",
        description="desc",
        logic_summary="logic",
        use_cases=["trend"],
        parameter_ranges={"period": "10-50"},
        definition_json=TEMPLATE_DEFINITION,
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


def test_clone_template_seeds_working_copy_with_definition(
    client, auth_headers, template
):
    """Cloning a template must seed the working copy so the editor opens with content."""
    clone_res = client.post(
        f"/strategy-templates/{template.id}/clone", headers=auth_headers
    )
    assert clone_res.status_code == 201
    new_strategy_id = clone_res.json()["id"]

    # The editor reads from the working copy — it must contain the template blocks.
    draft_res = client.get(
        f"/strategies/{new_strategy_id}/draft", headers=auth_headers
    )
    assert draft_res.status_code == 200
    definition = draft_res.json()["definition_json"]
    assert definition == TEMPLATE_DEFINITION
    assert definition != DEFAULT_DEFINITION
    assert len(definition["blocks"]) == 2


def test_clone_template_copies_strategy_metadata(client, auth_headers, template):
    """The cloned strategy inherits the template's name, asset and timeframe."""
    clone_res = client.post(
        f"/strategy-templates/{template.id}/clone", headers=auth_headers
    )
    assert clone_res.status_code == 201
    body = clone_res.json()
    assert body["name"] == template.name
    assert body["asset"] == template.asset
    assert body["timeframe"] == template.timeframe


def test_clone_unknown_template_returns_404(client, auth_headers):
    res = client.post(
        f"/strategy-templates/{uuid4()}/clone", headers=auth_headers
    )
    assert res.status_code == 404
