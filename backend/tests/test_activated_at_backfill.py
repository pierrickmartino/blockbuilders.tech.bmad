"""DB test for the `activated_at` backfill (issue #535, migration 039).

Loads the migration module directly and runs its exact `BACKFILL_SQL` against
seeded data — the same statement `alembic upgrade head` executes — so the
test exercises the real backfill, not a re-description of it.
"""
import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from sqlmodel import Session, text

from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import PlanTier, User, UserTier

_MIGRATION_PATH = (
    Path(__file__).resolve().parents[1] / "alembic" / "versions" / "039_add_activated_at.py"
)


def _load_backfill_sql() -> str:
    spec = importlib.util.spec_from_file_location("migration_039_add_activated_at", _MIGRATION_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.BACKFILL_SQL


def _make_user(session: Session) -> User:
    user = User(
        id=uuid4(),
        email=f"{uuid4()}@example.com",
        password_hash="$2b$12$test_hash",
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _make_run(session: Session, user: User, *, status: str, created_at: datetime) -> BacktestRun:
    strategy = Strategy(
        id=uuid4(),
        user_id=user.id,
        name="Test Strategy",
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(strategy)
    session.flush()

    version = StrategyVersion(
        id=uuid4(),
        strategy_id=strategy.id,
        version_number=1,
        definition_json={"blocks": []},
    )
    session.add(version)
    session.flush()

    run = BacktestRun(
        id=uuid4(),
        user_id=user.id,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        status=status,
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 1, 31, tzinfo=timezone.utc),
        created_at=created_at,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


def test_backfill_seeds_earliest_completed_run_per_user(session):
    earliest = datetime(2026, 1, 1, tzinfo=timezone.utc)
    later = datetime(2026, 2, 1, tzinfo=timezone.utc)

    activated_user = _make_user(session)
    _make_run(session, activated_user, status="completed", created_at=later)
    _make_run(session, activated_user, status="completed", created_at=earliest)
    _make_run(session, activated_user, status="failed", created_at=earliest - timedelta(days=10))

    failed_only_user = _make_user(session)
    _make_run(session, failed_only_user, status="failed", created_at=earliest)

    pending_only_user = _make_user(session)
    _make_run(session, pending_only_user, status="pending", created_at=earliest)

    no_runs_user = _make_user(session)

    session.exec(text(_load_backfill_sql()))
    session.commit()

    session.refresh(activated_user)
    session.refresh(failed_only_user)
    session.refresh(pending_only_user)
    session.refresh(no_runs_user)

    assert activated_user.activated_at == earliest.replace(tzinfo=None)
    assert failed_only_user.activated_at is None
    assert pending_only_user.activated_at is None
    assert no_runs_user.activated_at is None


def test_backfill_uses_minimum_created_at_across_multiple_completed_runs(session):
    earliest = datetime(2026, 1, 1, tzinfo=timezone.utc)
    middle = datetime(2026, 1, 15, tzinfo=timezone.utc)
    latest = datetime(2026, 2, 1, tzinfo=timezone.utc)

    user = _make_user(session)
    _make_run(session, user, status="completed", created_at=latest)
    _make_run(session, user, status="completed", created_at=earliest)
    _make_run(session, user, status="completed", created_at=middle)

    session.exec(text(_load_backfill_sql()))
    session.commit()
    session.refresh(user)

    assert user.activated_at == earliest.replace(tzinfo=None)
