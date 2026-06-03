"""Unit tests for the working-copy store (issue #514).

Tests the get_or_create_working_copy and upsert_working_copy functions
against a real in-memory SQLite DB — no HTTP layer involved.
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from uuid import uuid4

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.core.security import hash_password
from app.models.strategy import Strategy
from app.models.strategy_draft import StrategyDraft
from app.models.user import PlanTier, User, UserTier
from app.services.working_copy import (
    DEFAULT_DEFINITION,
    get_or_create_working_copy,
    upsert_working_copy,
)


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
def user(session):
    u = User(
        id=uuid4(),
        email="wc-test@example.com",
        password_hash=hash_password("TestPassword123!"),
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.BETA,
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


@pytest.fixture
def strategy(session, user):
    s = Strategy(
        id=uuid4(),
        user_id=user.id,
        name="Working Copy Test",
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


# ---------------------------------------------------------------------------
# Slice W1 — get_or_create_working_copy creates a working copy seeded with
#            the default definition when none exists
# ---------------------------------------------------------------------------


def test_get_or_create_creates_working_copy_with_default_definition(session, strategy):
    """When no working copy exists, get_or_create creates one with default graph."""
    wc = get_or_create_working_copy(strategy, session)

    assert wc is not None
    assert wc.strategy_id == strategy.id
    assert wc.definition_json == DEFAULT_DEFINITION

    # Persisted to DB
    row = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    assert row is not None
    assert row.definition_json == DEFAULT_DEFINITION


# ---------------------------------------------------------------------------
# Slice W2 — get_or_create_working_copy returns existing copy without
#            creating a duplicate
# ---------------------------------------------------------------------------


def test_get_or_create_is_idempotent(session, strategy):
    """Calling get_or_create twice must produce exactly one row in DB."""
    wc1 = get_or_create_working_copy(strategy, session)
    wc2 = get_or_create_working_copy(strategy, session)

    assert wc1.strategy_id == wc2.strategy_id

    rows = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).all()
    assert len(rows) == 1


# ---------------------------------------------------------------------------
# Slice W3 — upsert_working_copy overwrites definition_json
# ---------------------------------------------------------------------------


def test_upsert_overwrites_definition_json(session, strategy):
    """upsert_working_copy must update definition_json in the existing row."""
    get_or_create_working_copy(strategy, session)

    new_definition = {
        "blocks": [{"id": "b1", "type": "price"}],
        "connections": [],
        "meta": {"v": 2},
    }
    updated = upsert_working_copy(strategy, new_definition, session)

    assert updated.definition_json == new_definition

    # Only one row still exists
    rows = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).all()
    assert len(rows) == 1
    assert rows[0].definition_json == new_definition


# ---------------------------------------------------------------------------
# Slice W4 — upsert_working_copy creates and then updates (no pre-existing row)
# ---------------------------------------------------------------------------


def test_upsert_creates_working_copy_when_none_exists(session, strategy):
    """upsert without a pre-existing row must create the row."""
    definition = {"blocks": [], "connections": [], "meta": {"new": True}}
    wc = upsert_working_copy(strategy, definition, session)

    assert wc.strategy_id == strategy.id
    assert wc.definition_json == definition

    rows = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).all()
    assert len(rows) == 1
