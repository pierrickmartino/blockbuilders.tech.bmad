"""Regression tests for freeze behavior — now served by working_copy.freeze (issue #767).

The freeze_for_backtest name was the old version_freezer interface. These tests
have been updated to import working_copy.freeze directly, confirming that the
consolidated module preserves all prior behavior.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select, func

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from app.core.security import hash_password
from app.models.strategy import Strategy
from app.models.strategy_draft import StrategyDraft
from app.models.strategy_template import StrategyTemplate  # noqa: F401 — registers FK target
from app.models.strategy_version import StrategyVersion
from app.models.user import PlanTier, User, UserTier
from app.services.working_copy import freeze


# ── Fixtures ──────────────────────────────────────────────────────────────────

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
    strategy = Strategy(id=uuid4(), user_id=user_id, name="S", asset="BTC/USDT", timeframe="1d")
    session.add(strategy)
    session.commit()
    session.refresh(strategy)
    return strategy


def _set_working_copy(session, strategy, definition):
    draft = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    if draft:
        draft.definition_json = definition
        session.add(draft)
    else:
        session.add(StrategyDraft(strategy_id=strategy.id, definition_json=definition))
    session.commit()


# ── working_copy.freeze (was freeze_for_backtest) ─────────────────────────────

def test_freeze_creates_version_1_for_new_strategy(session):
    user = _make_user(session)
    strategy = _make_strategy(session, user.id)
    _set_working_copy(session, strategy, {"blocks": [{"id": "a"}], "connections": [], "meta": {}})

    version = freeze(strategy, session)
    session.commit()

    assert version.version_number == 1
    assert version.strategy_id == strategy.id


def test_freeze_reuses_version_when_working_copy_unchanged(session):
    user = _make_user(session)
    strategy = _make_strategy(session, user.id)
    definition = {"blocks": [{"id": "b"}], "connections": [], "meta": {}}
    _set_working_copy(session, strategy, definition)

    v1 = freeze(strategy, session)
    session.commit()

    v2 = freeze(strategy, session)
    session.commit()

    assert v1.id == v2.id
    count = session.exec(
        select(func.count(StrategyVersion.id)).where(StrategyVersion.strategy_id == strategy.id)
    ).one()
    assert count == 1


def test_freeze_creates_new_version_after_edit(session):
    user = _make_user(session)
    strategy = _make_strategy(session, user.id)
    _set_working_copy(session, strategy, {"blocks": [{"id": "c1"}], "connections": [], "meta": {}})

    v1 = freeze(strategy, session)
    session.commit()

    _set_working_copy(session, strategy, {"blocks": [{"id": "c2"}], "connections": [], "meta": {}})

    v2 = freeze(strategy, session)
    session.commit()

    assert v1.id != v2.id
    assert v2.version_number == 2


def test_freeze_sequential_numbering_across_edits(session):
    user = _make_user(session)
    strategy = _make_strategy(session, user.id)

    for i in range(1, 5):
        _set_working_copy(session, strategy, {"blocks": [{"id": f"node-{i}"}], "connections": [], "meta": {}})
        v = freeze(strategy, session)
        session.commit()
        assert v.version_number == i


def test_two_backtests_share_one_version_row(session):
    user = _make_user(session)
    strategy = _make_strategy(session, user.id)
    _set_working_copy(session, strategy, {"blocks": [{"id": "shared"}], "connections": [], "meta": {}})

    run1_version = freeze(strategy, session)
    session.commit()

    run2_version = freeze(strategy, session)
    session.commit()

    assert run1_version.id == run2_version.id
    count = session.exec(
        select(func.count(StrategyVersion.id)).where(StrategyVersion.strategy_id == strategy.id)
    ).one()
    assert count == 1


def test_freeze_auto_creates_working_copy_when_absent(session):
    user = _make_user(session)
    strategy = _make_strategy(session, user.id)
    # Deliberately no working copy

    version = freeze(strategy, session)
    session.commit()

    assert version.version_number == 1
    draft = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    assert draft is not None
