"""Unit tests for the consolidated Working copy module (issue #767).

Tests drive the four public verbs — create, get, save, freeze — against a real
in-memory SQLite DB. No HTTP layer involved.

Transaction contract: every assertion that a change is flushed-but-uncommitted
checks visibility within the same session before calling session.commit().
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from uuid import uuid4

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, func, select

from app.core.security import hash_password
from app.models.strategy import Strategy
from app.models.strategy_draft import StrategyDraft
from app.models.strategy_template import StrategyTemplate  # noqa: F401 — registers FK target
from app.models.strategy_version import StrategyVersion
from app.models.user import PlanTier, User, UserTier
import app.services.working_copy as working_copy
from app.services.working_copy import DEFAULT_DEFINITION


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(name="engine")
def engine_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine):
    with Session(engine) as session:
        yield session


def _make_user(session):
    user = User(
        id=uuid4(),
        email=f"user-{uuid4()}@example.com",
        password_hash=hash_password("Password123!"),
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
        backtest_credit_balance=0,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _make_strategy(session, user_id):
    s = Strategy(id=uuid4(), user_id=user_id, name="S", asset="BTC/USDT", timeframe="1d")
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


@pytest.fixture(name="strategy")
def strategy_fixture(session):
    user = _make_user(session)
    return _make_strategy(session, user.id)


# ---------------------------------------------------------------------------
# freeze — centerpiece: deduplication reuse vs mint
# ---------------------------------------------------------------------------


def test_freeze_reuses_version_when_working_copy_unchanged(session, strategy):
    """Identical working copy → same version row returned; no second row created."""
    definition = {"blocks": [{"id": "b"}], "connections": [], "meta": {}}
    working_copy.create(strategy, session, definition=definition)
    session.commit()

    v1 = working_copy.freeze(strategy, session)
    session.commit()

    v2 = working_copy.freeze(strategy, session)
    session.commit()

    assert v1.id == v2.id
    count = session.exec(
        select(func.count(StrategyVersion.id)).where(StrategyVersion.strategy_id == strategy.id)
    ).one()
    assert count == 1


def test_freeze_mints_next_version_when_working_copy_changed(session, strategy):
    """Changed working copy → new row with version_number = previous + 1."""
    working_copy.create(strategy, session, definition={"blocks": [{"id": "c1"}], "connections": [], "meta": {}})
    session.commit()

    v1 = working_copy.freeze(strategy, session)
    session.commit()

    working_copy.save(strategy, {"blocks": [{"id": "c2"}], "connections": [], "meta": {}}, session)
    session.commit()

    v2 = working_copy.freeze(strategy, session)
    session.commit()

    assert v1.id != v2.id
    assert v2.version_number == 2


def test_freeze_creates_version_1_for_new_strategy(session, strategy):
    """First freeze on a strategy with no prior versions produces version_number == 1."""
    working_copy.create(strategy, session, definition={"blocks": [{"id": "a"}], "connections": [], "meta": {}})
    session.commit()

    version = working_copy.freeze(strategy, session)
    session.commit()

    assert version.version_number == 1
    assert version.strategy_id == strategy.id


def test_freeze_sequential_numbering_across_edits(session, strategy):
    """Four successive edits-and-freezes produce version_numbers 1, 2, 3, 4."""
    working_copy.create(strategy, session, definition={"blocks": [], "connections": [], "meta": {}})
    session.commit()

    for i in range(1, 5):
        working_copy.save(strategy, {"blocks": [{"id": f"node-{i}"}], "connections": [], "meta": {}}, session)
        session.commit()
        v = working_copy.freeze(strategy, session)
        session.commit()
        assert v.version_number == i


def test_freeze_auto_seeds_default_when_no_working_copy(session, strategy):
    """freeze on a strategy with no working copy seeds the default and freezes version 1."""
    version = working_copy.freeze(strategy, session)
    session.commit()

    assert version.version_number == 1
    draft = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    assert draft is not None
    assert draft.definition_json == DEFAULT_DEFINITION


# ---------------------------------------------------------------------------
# create
# ---------------------------------------------------------------------------


def test_create_seeds_default_definition_when_none_provided(session, strategy):
    """create() without definition arg produces a working copy with DEFAULT_DEFINITION."""
    wc = working_copy.create(strategy, session)
    session.commit()

    assert wc.strategy_id == strategy.id
    assert wc.definition_json == DEFAULT_DEFINITION

    rows = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).all()
    assert len(rows) == 1


def test_create_seeds_provided_definition(session, strategy):
    """create() with a definition arg seeds that definition, not the default."""
    definition = {"blocks": [{"id": "tmpl-1"}], "connections": [], "meta": {"source": "template"}}
    wc = working_copy.create(strategy, session, definition=definition)
    session.commit()

    assert wc.definition_json == definition
    row = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    assert row is not None
    assert row.definition_json == definition


def test_create_raises_when_working_copy_already_exists(session, strategy):
    """create() raises ValueError if a working copy already exists (precondition guard)."""
    working_copy.create(strategy, session)
    session.commit()

    with pytest.raises(ValueError, match="working copy already exists"):
        working_copy.create(strategy, session)


def test_create_flushes_but_does_not_commit(session, strategy):
    """create() flushes so the row is visible within the session but the caller commits."""
    wc = working_copy.create(strategy, session)

    # Visible in-session without a commit
    row = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    assert row is not None
    assert row.id == wc.id

    # Now commit — confirming the row persists
    session.commit()
    row2 = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    assert row2 is not None


# ---------------------------------------------------------------------------
# get
# ---------------------------------------------------------------------------


def test_get_returns_existing_working_copy(session, strategy):
    """get() returns the existing working copy without creating a duplicate."""
    working_copy.create(strategy, session, definition={"blocks": [{"id": "x"}], "connections": [], "meta": {}})
    session.commit()

    wc = working_copy.get(strategy, session)

    assert wc.strategy_id == strategy.id
    assert wc.definition_json == {"blocks": [{"id": "x"}], "connections": [], "meta": {}}

    rows = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).all()
    assert len(rows) == 1


def test_get_defensively_seeds_default_when_absent(session, strategy):
    """get() creates a working copy with DEFAULT_DEFINITION if none exists."""
    wc = working_copy.get(strategy, session)
    session.commit()

    assert wc.strategy_id == strategy.id
    assert wc.definition_json == DEFAULT_DEFINITION

    rows = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).all()
    assert len(rows) == 1


# ---------------------------------------------------------------------------
# save
# ---------------------------------------------------------------------------


def test_save_overwrites_definition_on_existing_copy(session, strategy):
    """save() replaces definition_json in the existing row; exactly one row remains."""
    working_copy.create(strategy, session)
    session.commit()

    new_definition = {"blocks": [{"id": "b1", "type": "price"}], "connections": [], "meta": {"v": 2}}
    updated = working_copy.save(strategy, new_definition, session)
    session.commit()

    assert updated.definition_json == new_definition

    rows = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).all()
    assert len(rows) == 1
    assert rows[0].definition_json == new_definition


def test_save_raises_when_no_working_copy_exists(session, strategy):
    """save() raises ValueError if no working copy exists (precondition guard)."""
    with pytest.raises(ValueError, match="no working copy"):
        working_copy.save(strategy, {"blocks": [], "connections": [], "meta": {}}, session)


def test_save_flushes_but_does_not_commit(session, strategy):
    """save() flushes so the update is visible in-session; caller commits."""
    working_copy.create(strategy, session)
    session.commit()

    new_definition = {"blocks": [{"id": "flush-test"}], "connections": [], "meta": {}}
    working_copy.save(strategy, new_definition, session)

    # Visible in-session before commit
    row = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    assert row is not None
    assert row.definition_json == new_definition

    session.commit()


# ---------------------------------------------------------------------------
# Transaction contract pin — freeze
# ---------------------------------------------------------------------------


def test_freeze_flushes_but_does_not_commit(session, strategy):
    """freeze() flushes the new version so it is visible in-session; caller commits."""
    working_copy.create(strategy, session, definition={"blocks": [{"id": "tx"}], "connections": [], "meta": {}})
    session.commit()

    version = working_copy.freeze(strategy, session)

    # Visible in-session before caller commits
    row = session.exec(
        select(StrategyVersion).where(StrategyVersion.id == version.id)
    ).first()
    assert row is not None

    session.commit()
