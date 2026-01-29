"""Shared test fixtures and configuration."""
import os
from datetime import datetime, timezone
from typing import Generator
from uuid import uuid4

import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool

# Set test environment before importing app modules
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"

from app.models.user import User, PlanTier, UserTier
from app.models.candle import Candle


@pytest.fixture(name="engine")
def engine_fixture():
    """Create an in-memory SQLite engine for testing."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine) -> Generator[Session, None, None]:
    """Create a new database session for a test."""
    with Session(engine) as session:
        yield session


@pytest.fixture
def test_user(session: Session) -> User:
    """Create a test user."""
    user = User(
        id=uuid4(),
        email="test@example.com",
        password_hash="$2b$12$test_hash",
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
        max_strategies=10,
        max_backtests_per_day=50,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def beta_user(session: Session) -> User:
    """Create a beta test user."""
    user = User(
        id=uuid4(),
        email="beta@example.com",
        password_hash="$2b$12$test_hash",
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.BETA,
        max_strategies=20,
        max_backtests_per_day=100,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def sample_candles() -> list[Candle]:
    """Create sample OHLCV candles for testing."""
    base_time = datetime(2024, 1, 1, tzinfo=timezone.utc)
    prices = [
        (100, 105, 98, 102, 1000),   # Day 1
        (102, 108, 101, 107, 1200),  # Day 2
        (107, 110, 105, 109, 1100),  # Day 3
        (109, 112, 106, 108, 900),   # Day 4
        (108, 115, 107, 114, 1500),  # Day 5
        (114, 118, 112, 116, 1400),  # Day 6
        (116, 120, 113, 118, 1300),  # Day 7
        (118, 119, 110, 112, 1600),  # Day 8: reversal
        (112, 115, 108, 110, 1200),  # Day 9
        (110, 112, 105, 106, 1100),  # Day 10
    ]

    candles = []
    for i, (o, h, l, c, v) in enumerate(prices):
        candle = Candle(
            id=uuid4(),
            asset="BTC/USDT",
            timeframe="1d",
            timestamp=base_time.replace(day=base_time.day + i),
            open=float(o),
            high=float(h),
            low=float(l),
            close=float(c),
            volume=float(v),
        )
        candles.append(candle)

    return candles


@pytest.fixture
def uptrend_candles() -> list[Candle]:
    """Create candles with a clear uptrend for testing."""
    base_time = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles = []

    for i in range(20):
        base_price = 100 + i * 2  # Steadily increasing
        candle = Candle(
            id=uuid4(),
            asset="BTC/USDT",
            timeframe="1d",
            timestamp=base_time.replace(day=base_time.day + i),
            open=float(base_price),
            high=float(base_price + 3),
            low=float(base_price - 1),
            close=float(base_price + 2),
            volume=1000.0,
        )
        candles.append(candle)

    return candles


@pytest.fixture
def downtrend_candles() -> list[Candle]:
    """Create candles with a clear downtrend for testing."""
    base_time = datetime(2024, 1, 1, tzinfo=timezone.utc)
    candles = []

    for i in range(20):
        base_price = 200 - i * 2  # Steadily decreasing
        candle = Candle(
            id=uuid4(),
            asset="BTC/USDT",
            timeframe="1d",
            timestamp=base_time.replace(day=base_time.day + i),
            open=float(base_price),
            high=float(base_price + 1),
            low=float(base_price - 3),
            close=float(base_price - 2),
            volume=1000.0,
        )
        candles.append(candle)

    return candles
