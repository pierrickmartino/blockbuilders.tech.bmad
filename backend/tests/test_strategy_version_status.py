"""Tests for StrategyVersion status field (issue #457).

TDD vertical slices — each test covers one observable behavior.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool
from uuid import uuid4

from app.models.strategy_version import StrategyVersion, VersionStatus


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
def session_fixture(engine) -> Session:
    with Session(engine) as session:
        yield session


@pytest.fixture
def strategy_id():
    return uuid4()


# ---------------------------------------------------------------------------
# Slice 1 — VersionStatus enum has exactly the three expected values
# ---------------------------------------------------------------------------


def test_version_status_enum_values():
    """VersionStatus must expose draft, published, and archived — no more."""
    values = {s.value for s in VersionStatus}
    assert values == {"draft", "published", "archived"}


def test_version_status_members_are_strings():
    """VersionStatus members must be str subclass so they serialise naturally."""
    for member in VersionStatus:
        assert isinstance(member, str), f"{member!r} is not a str subclass"


# ---------------------------------------------------------------------------
# Slice 2 — New StrategyVersion defaults status to 'draft'
# ---------------------------------------------------------------------------


def test_new_strategy_version_defaults_to_draft(session: Session, strategy_id):
    """A freshly created StrategyVersion must have status == 'draft'."""
    # Arrange — create a minimal Strategy row first (FK constraint)
    from app.models.strategy import Strategy
    from app.models.user import User, PlanTier, UserTier

    user = User(
        id=uuid4(),
        email="status-test@example.com",
        password_hash="$2b$12$test",
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
        max_strategies=5,
        max_backtests_per_day=10,
    )
    session.add(user)
    session.commit()

    strategy = Strategy(
        id=strategy_id,
        user_id=user.id,
        name="Test Strategy",
        asset="BTC/USDT",
        timeframe="1h",
    )
    session.add(strategy)
    session.commit()

    # Act
    version = StrategyVersion(
        strategy_id=strategy_id,
        version_number=1,
        definition_json={},
    )
    session.add(version)
    session.commit()
    session.refresh(version)

    # Assert
    assert version.status == VersionStatus.DRAFT
    assert version.status.value == "draft"


# ---------------------------------------------------------------------------
# Slice 3 — All three status values can be persisted and retrieved
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "status_value",
    [VersionStatus.DRAFT, VersionStatus.PUBLISHED, VersionStatus.ARCHIVED],
)
def test_strategy_version_persists_all_statuses(
    session: Session, status_value: VersionStatus
):
    """Each of the three status values must survive a round-trip to the DB."""
    from app.models.strategy import Strategy
    from app.models.user import User, PlanTier, UserTier

    user = User(
        id=uuid4(),
        email=f"status-{status_value.value}@example.com",
        password_hash="$2b$12$test",
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
        max_strategies=5,
        max_backtests_per_day=10,
    )
    session.add(user)

    strategy = Strategy(
        id=uuid4(),
        user_id=user.id,
        name=f"Strategy {status_value.value}",
        asset="BTC/USDT",
        timeframe="1h",
    )
    session.add(strategy)
    session.commit()

    # Act
    version = StrategyVersion(
        strategy_id=strategy.id,
        version_number=1,
        definition_json={},
        status=status_value,
    )
    session.add(version)
    session.commit()

    # Re-fetch from DB to prove persistence, not in-memory caching
    session.expire(version)
    session.refresh(version)

    # Assert
    assert version.status == status_value


# ---------------------------------------------------------------------------
# Slice 4 — Existing StrategyVersion creation still works (no regression)
# ---------------------------------------------------------------------------


def test_strategy_version_creation_without_explicit_status(session: Session):
    """Code that creates StrategyVersion without setting status must still work."""
    from app.models.strategy import Strategy
    from app.models.user import User, PlanTier, UserTier

    user = User(
        id=uuid4(),
        email="regression@example.com",
        password_hash="$2b$12$test",
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
        max_strategies=5,
        max_backtests_per_day=10,
    )
    session.add(user)

    strategy = Strategy(id=uuid4(), user_id=user.id, name="Regression Strategy", asset="BTC/USDT", timeframe="1d")
    session.add(strategy)
    session.commit()

    # This mirrors how existing code creates versions — no status kwarg
    version = StrategyVersion(
        strategy_id=strategy.id,
        version_number=1,
        definition_json={"nodes": [], "edges": []},
    )
    session.add(version)
    session.commit()
    session.refresh(version)

    # Existing fields still present
    assert version.id is not None
    assert version.version_number == 1
    assert version.definition_json == {"nodes": [], "edges": []}
    # New field defaults correctly
    assert version.status == VersionStatus.DRAFT
