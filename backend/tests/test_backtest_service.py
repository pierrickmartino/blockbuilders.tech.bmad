"""Unit tests for backtest_service: RED phase — written before implementation."""
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import PlanTier, User, UserTier
from app.core.security import hash_password


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


def _make_user(session, *, plan_tier=PlanTier.FREE, user_tier=UserTier.STANDARD, credits=0):
    user = User(
        id=uuid4(),
        email=f"user-{uuid4()}@example.com",
        password_hash=hash_password("Password123!"),
        plan_tier=plan_tier,
        user_tier=user_tier,
        backtest_credit_balance=credits,
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


def _make_version(session, strategy_id, version_number=1):
    version = StrategyVersion(
        id=uuid4(),
        strategy_id=strategy_id,
        version_number=version_number,
        definition_json={"nodes": [], "edges": []},
    )
    session.add(version)
    session.commit()
    return version


# ── Exception class tests ─────────────────────────────────────────────────────

def test_daily_limit_reached_status_code():
    from app.services.exceptions import DailyLimitReached

    reset = datetime(2026, 5, 22, 0, 0, 0, tzinfo=timezone.utc)
    err = DailyLimitReached(limit=50, reset_time=reset)
    assert err.status_code == 429


def test_daily_limit_reached_detail_shape():
    from app.services.exceptions import DailyLimitReached

    reset = datetime(2026, 5, 22, 0, 0, 0, tzinfo=timezone.utc)
    err = DailyLimitReached(limit=50, reset_time=reset)
    detail = err.detail()
    assert isinstance(detail, dict)
    assert "detail" in detail
    assert "50" in detail["detail"]
    assert reset.isoformat() in detail["detail"]


def test_history_depth_exceeded_status_code():
    from app.services.exceptions import HistoryDepthExceeded

    err = HistoryDepthExceeded(limit_days=365)
    assert err.status_code == 400


def test_history_depth_exceeded_detail_shape():
    from app.services.exceptions import HistoryDepthExceeded

    err = HistoryDepthExceeded(limit_days=365)
    detail = err.detail()
    assert isinstance(detail, dict)
    assert "detail" in detail
    assert "365" in detail["detail"]


def test_strategy_has_no_versions_status_code():
    from app.services.exceptions import StrategyHasNoVersions

    err = StrategyHasNoVersions()
    assert err.status_code == 400


def test_strategy_has_no_versions_detail_shape():
    from app.services.exceptions import StrategyHasNoVersions

    err = StrategyHasNoVersions()
    detail = err.detail()
    assert isinstance(detail, dict)
    assert "detail" in detail
    assert len(detail["detail"]) > 0


# ── check_daily_limit ─────────────────────────────────────────────────────────

def test_check_daily_limit_ok_when_under_limit(session):
    from app.services.backtest_service import LimitState, check_daily_limit

    user = _make_user(session)
    state = check_daily_limit(user, session)
    assert state == LimitState.OK


def test_check_daily_limit_over_using_credit_when_has_credits(session, monkeypatch):
    from app.services.backtest_service import LimitState, check_daily_limit

    user = _make_user(session, credits=5)
    monkeypatch.setattr(
        "app.services.backtest_service.get_effective_limits",
        lambda *a, **kw: {"max_backtests_per_day": 0, "max_history_days": 365, "max_strategies": 10},
    )
    state = check_daily_limit(user, session)
    assert state == LimitState.OVER_USING_CREDIT


def test_check_daily_limit_over_no_credit_when_no_credits(session, monkeypatch):
    from app.services.backtest_service import LimitState, check_daily_limit

    user = _make_user(session, credits=0)
    monkeypatch.setattr(
        "app.services.backtest_service.get_effective_limits",
        lambda *a, **kw: {"max_backtests_per_day": 0, "max_history_days": 365, "max_strategies": 10},
    )
    state = check_daily_limit(user, session)
    assert state == LimitState.OVER_NO_CREDIT


def test_check_daily_limit_projected_count_tips_over(session, monkeypatch):
    from app.services.backtest_service import LimitState, check_daily_limit

    user = _make_user(session, credits=0)
    monkeypatch.setattr(
        "app.services.backtest_service.get_effective_limits",
        lambda *a, **kw: {"max_backtests_per_day": 1, "max_history_days": 365, "max_strategies": 10},
    )
    state = check_daily_limit(user, session, projected_count=1)
    assert state == LimitState.OVER_NO_CREDIT


# ── enforce_daily_limit ───────────────────────────────────────────────────────

def test_enforce_daily_limit_returns_false_when_under_limit(session):
    from app.services.backtest_service import enforce_daily_limit

    user = _make_user(session)
    result = enforce_daily_limit(user, session)
    assert result is False


def test_enforce_daily_limit_returns_true_when_over_limit_with_credits(session, monkeypatch):
    from app.services.backtest_service import enforce_daily_limit

    user = _make_user(session, credits=3)
    monkeypatch.setattr(
        "app.services.backtest_service.get_effective_limits",
        lambda *a, **kw: {"max_backtests_per_day": 0, "max_history_days": 365, "max_strategies": 10},
    )
    result = enforce_daily_limit(user, session)
    assert result is True


def test_enforce_daily_limit_raises_when_over_limit_no_credits(session, monkeypatch):
    from app.services.backtest_service import enforce_daily_limit
    from app.services.exceptions import DailyLimitReached

    user = _make_user(session, credits=0)
    monkeypatch.setattr(
        "app.services.backtest_service.get_effective_limits",
        lambda *a, **kw: {"max_backtests_per_day": 0, "max_history_days": 365, "max_strategies": 10},
    )
    with pytest.raises(DailyLimitReached) as exc_info:
        enforce_daily_limit(user, session)
    assert exc_info.value.status_code == 429


# ── enforce_history_depth ─────────────────────────────────────────────────────

def test_enforce_history_depth_passes_within_limit(session):
    from app.services.backtest_service import enforce_history_depth

    user = _make_user(session)
    now = datetime.now(timezone.utc)
    enforce_history_depth(user, now - timedelta(days=30), now)


def test_enforce_history_depth_raises_when_exceeds_limit(session):
    from app.services.backtest_service import enforce_history_depth
    from app.services.exceptions import HistoryDepthExceeded

    user = _make_user(session, plan_tier=PlanTier.FREE)
    now = datetime.now(timezone.utc)
    with pytest.raises(HistoryDepthExceeded) as exc_info:
        enforce_history_depth(user, now - timedelta(days=400), now)
    assert exc_info.value.status_code == 400
    assert exc_info.value.limit_days == 365


# ── latest_version ────────────────────────────────────────────────────────────

def test_latest_version_returns_most_recent(session):
    from app.services.backtest_service import latest_version

    user = _make_user(session)
    strategy = _make_strategy(session, user.id)
    _make_version(session, strategy.id, version_number=1)
    v2 = _make_version(session, strategy.id, version_number=2)

    result = latest_version(strategy, session)
    assert result.id == v2.id


def test_latest_version_raises_when_no_versions(session):
    from app.services.backtest_service import latest_version
    from app.services.exceptions import StrategyHasNoVersions

    user = _make_user(session)
    strategy = _make_strategy(session, user.id)

    with pytest.raises(StrategyHasNoVersions):
        latest_version(strategy, session)


# ── build_run ─────────────────────────────────────────────────────────────────

def test_build_run_returns_run_and_job_spec(session):
    from app.services.backtest_service import JobSpec, build_run

    user = _make_user(session)
    strategy = _make_strategy(session, user.id)
    version = _make_version(session, strategy.id)
    now = datetime.now(timezone.utc)

    run, job_spec = build_run(
        user, strategy, version, session,
        now - timedelta(days=10), now,
        0.001, 0.001, 0.001,
        correlation_id="test-cid",
    )

    assert run.id is not None
    assert isinstance(job_spec, JobSpec)
    assert job_spec.run_id == str(run.id)
    assert job_spec.correlation_id == "test-cid"
    assert job_spec.force_refresh_prices is False


def test_build_run_does_not_commit(session):
    """build_run only flushes — rolled-back session leaves no persisted row."""
    from app.services.backtest_service import build_run
    from sqlmodel import select

    user = _make_user(session)
    strategy = _make_strategy(session, user.id)
    version = _make_version(session, strategy.id)
    now = datetime.now(timezone.utc)

    run, _ = build_run(
        user, strategy, version, session,
        now - timedelta(days=10), now,
        0.001, 0.001, 0.001,
        correlation_id=None,
    )

    session.rollback()

    persisted = session.exec(select(BacktestRun).where(BacktestRun.id == run.id)).first()
    assert persisted is None


# ── resolve_rates ─────────────────────────────────────────────────────────────

def test_resolve_rates_uses_explicit_values(session):
    from app.services.backtest_service import resolve_rates

    user = _make_user(session)
    fee, slip, spread = resolve_rates(user, 0.002, 0.003, 0.004)
    assert fee == 0.002
    assert slip == 0.003
    assert spread == 0.004


def test_resolve_rates_falls_back_to_global_defaults(session, monkeypatch):
    from app.services.backtest_service import resolve_rates
    from app.core import config

    monkeypatch.setattr(config.settings, "default_fee_rate", 0.01)
    monkeypatch.setattr(config.settings, "default_slippage_rate", 0.02)
    monkeypatch.setattr(config.settings, "default_spread_rate", 0.03)

    user = _make_user(session)
    # User has no defaults set (None) and no explicit request values
    fee, slip, spread = resolve_rates(user, None, None, None)
    assert fee == 0.01
    assert slip == 0.02
    assert spread == 0.03
