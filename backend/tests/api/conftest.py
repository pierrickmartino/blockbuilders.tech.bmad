import os
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from app.core.database import get_session
from app.core.security import hash_password
from app.main import app
from app.models.backtest_run import BacktestRun
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.strategy_template import StrategyTemplate
from app.models.strategy_version import StrategyVersion
from app.models.user import PlanTier, User, UserTier


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
        email="docs-user@example.com",
        password_hash=hash_password("CorrectPassword123!"),
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.BETA,
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


@pytest.fixture
def auth_headers(client, user):
    res = client.post("/auth/login", json={"email": user.email, "password": "CorrectPassword123!"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['token']}"}


@pytest.fixture
def seeded_objects(session, user):
    strategy = Strategy(id=uuid4(), user_id=user.id, name="S1", asset="BTC/USDT", timeframe="1d")
    session.add(strategy)
    session.commit()
    version = StrategyVersion(id=uuid4(), strategy_id=strategy.id, version_number=1, definition_json={"nodes": [], "edges": []})
    session.add(version)
    run = BacktestRun(
        id=uuid4(),
        user_id=user.id,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        status="completed",
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2024,1,1,tzinfo=timezone.utc),
        date_to=datetime(2024,1,10,tzinfo=timezone.utc),
        trades_key="trades.json",
        equity_curve_key="eq.json",
        benchmark_equity_curve_key="beq.json",
        total_return=12.3,
        num_trades=1,
    )
    session.add(run)
    note = Notification(user_id=user.id, type="info", title="t", body="b")
    session.add(note)
    template = StrategyTemplate(
        id=uuid4(),
        name="Template",
        description="desc",
        logic_summary="logic",
        use_cases=["swing"],
        parameter_ranges={"x": "1"},
        definition_json={"nodes": [], "edges": []},
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(template)
    session.commit()
    return {"strategy": strategy, "version": version, "run": run, "notification": note, "template": template}
