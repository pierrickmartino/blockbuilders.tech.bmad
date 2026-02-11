"""Tests for backtest API permission gating."""
import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine

# Set test environment
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"

from app.core.database import get_session
from app.core.security import hash_password
from app.main import app
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import PlanTier, User, UserTier


@pytest.fixture(name="engine")
def engine_fixture():
    """Create test database engine."""
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
    """Create test database session."""
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session):
    """Create test client with database session override."""

    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def _create_user(session: Session, email: str, user_tier: UserTier) -> User:
    user = User(
        id=uuid4(),
        email=email,
        password_hash=hash_password("CorrectPassword123!"),
        plan_tier=PlanTier.FREE,
        user_tier=user_tier,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _create_strategy_with_version(session: Session, user_id):
    strategy = Strategy(
        id=uuid4(),
        user_id=user_id,
        name="RSI Test",
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(strategy)
    session.commit()
    session.refresh(strategy)

    version = StrategyVersion(
        id=uuid4(),
        strategy_id=strategy.id,
        version_number=1,
        definition_json={"nodes": [], "edges": []},
    )
    session.add(version)
    session.commit()

    return strategy


def _login_and_get_token(client: TestClient, email: str) -> str:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": "CorrectPassword123!"},
    )
    assert response.status_code == 200
    return response.json()["token"]


def test_force_refresh_prices_forbidden_for_non_beta_user(client: TestClient, session: Session):
    user = _create_user(session, "standard@example.com", UserTier.STANDARD)
    strategy = _create_strategy_with_version(session, user.id)
    token = _login_and_get_token(client, user.email)

    response = client.post(
        "/backtests/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "strategy_id": str(strategy.id),
            "date_from": "2026-01-01T00:00:00Z",
            "date_to": "2026-01-10T23:59:59Z",
            "force_refresh_prices": True,
        },
    )

    assert response.status_code == 403
    assert "Beta User" in response.json()["detail"]


def test_force_refresh_prices_allowed_for_beta_user(client: TestClient, session: Session, monkeypatch):
    user = _create_user(session, "beta@example.com", UserTier.BETA)
    strategy = _create_strategy_with_version(session, user.id)
    token = _login_and_get_token(client, user.email)

    class FakeQueue:
        def __init__(self):
            self.calls = []

        def enqueue(self, *args, **kwargs):
            self.calls.append((args, kwargs))

    fake_queue = FakeQueue()
    monkeypatch.setattr("app.api.backtests.get_redis_queue", lambda: fake_queue)

    response = client.post(
        "/backtests/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "strategy_id": str(strategy.id),
            "date_from": "2026-01-01T00:00:00Z",
            "date_to": "2026-01-10T23:59:59Z",
            "force_refresh_prices": True,
        },
    )

    assert response.status_code == 201
    assert len(fake_queue.calls) == 1

    args, kwargs = fake_queue.calls[0]
    assert args[0] == "app.worker.jobs.run_backtest_job"
    assert args[2] is True
    assert kwargs["job_timeout"] == 300
