"""Integration tests for POST /backtests/coach endpoint.

Focuses on graceful degradation: suppression cases that must never break the page.
"""
import os
from datetime import datetime, timezone
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-coach"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"

from app.core.database import get_session
from app.core.security import hash_password
from app.main import app
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import PlanTier, User, UserTier


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


@pytest.fixture(name="client")
def client_fixture(session):
    def _override():
        return session

    app.dependency_overrides[get_session] = _override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def _create_user(session: Session) -> User:
    user = User(
        id=uuid4(),
        email="coach_test@example.com",
        password_hash=hash_password("CorrectPassword123!"),
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _login(client: TestClient, email: str) -> str:
    r = client.post("/auth/login", json={"email": email, "password": "CorrectPassword123!"})
    assert r.status_code == 200
    return r.json()["token"]


def _seed_pair(session: Session, user: User):
    """Seed two completed runs over non-aligned windows that need a re-run."""
    strategy = Strategy(
        id=uuid4(),
        user_id=user.id,
        name="Coach Test Strategy",
        asset="BTC/USDT",
        timeframe="1h",
    )
    session.add(strategy)
    session.commit()
    session.refresh(strategy)

    version_a = StrategyVersion(
        id=uuid4(),
        strategy_id=strategy.id,
        version_number=1,
        definition_json={"blocks": [], "connections": [], "meta": {}},
    )
    version_b = StrategyVersion(
        id=uuid4(),
        strategy_id=strategy.id,
        version_number=2,
        definition_json={"blocks": [], "connections": [], "meta": {}},
    )
    session.add(version_a)
    session.add(version_b)
    session.commit()

    run_a = BacktestRun(
        user_id=user.id,
        strategy_id=strategy.id,
        strategy_version_id=version_a.id,
        status="completed",
        asset="BTC/USDT",
        timeframe="1h",
        date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 6, 1, tzinfo=timezone.utc),
        fee_rate=0.001,
        slippage_rate=0.0005,
        spread_rate=0.0,
    )
    run_b = BacktestRun(
        user_id=user.id,
        strategy_id=strategy.id,
        strategy_version_id=version_b.id,
        status="completed",
        asset="BTC/USDT",
        timeframe="1h",
        date_from=datetime(2024, 3, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 9, 1, tzinfo=timezone.utc),
        fee_rate=0.001,
        slippage_rate=0.0005,
        spread_rate=0.0,
    )
    session.add(run_a)
    session.add(run_b)
    session.commit()
    session.refresh(run_a)
    session.refresh(run_b)
    return run_a, run_b


class TestCoachFailedComparison:
    def test_redis_failure_returns_failed_comparison_not_503(
        self, client: TestClient, session: Session
    ):
        """When Redis is unavailable during re-run enqueue, the endpoint must
        return eligible=False, reason='failed_comparison' (HTTP 200) rather
        than raising a 503 — so the compare page never breaks."""
        user = _create_user(session)
        token = _login(client, user.email)
        run_a, run_b = _seed_pair(session, user)

        with patch("app.api.backtest_coach.get_redis_queue") as mock_get_queue:
            mock_get_queue.side_effect = Exception("Redis unavailable")

            r = client.post(
                "/backtests/coach",
                headers={"Authorization": f"Bearer {token}"},
                json={"run_id_a": str(run_a.id), "run_id_b": str(run_b.id)},
            )

        assert r.status_code == 200
        body = r.json()
        assert body["eligible"] is False
        assert body["reason"] == "failed_comparison"
