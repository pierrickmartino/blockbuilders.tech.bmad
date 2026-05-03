"""Tests for GET /market/chart-data (FEAT-100)."""
import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"

from app.core.database import get_session
from app.core.security import hash_password
from app.main import app
from app.models.candle import Candle
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
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def _seed_user(session: Session) -> User:
    user = User(
        id=uuid4(),
        email="chart-user@example.com",
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
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _seed_candles(session: Session, count: int = 60, asset: str = "BTC/USDT") -> list[datetime]:
    """Seed `count` daily candles with a deterministic price walk."""
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    timestamps: list[datetime] = []
    for i in range(count):
        ts = base + timedelta(days=i)
        timestamps.append(ts)
        # Synthetic OHLC with mild oscillation so RSI is well-defined.
        price = 100.0 + (i % 7) * 1.5 + i * 0.4
        session.add(Candle(
            id=uuid4(),
            asset=asset,
            timeframe="1d",
            timestamp=ts,
            open=price,
            high=price + 1.5,
            low=price - 1.0,
            close=price + 0.5,
            volume=1000.0 + i,
        ))
    session.commit()
    return timestamps


# --- Auth / validation ----------------------------------------------------


def test_feat_100_chart_data_requires_auth(client: TestClient):
    r = client.get("/market/chart-data", params={"asset": "BTC/USDT", "timeframe": "1d"})
    assert r.status_code in (401, 403)


def test_feat_100_chart_data_unsupported_asset(client: TestClient, session: Session):
    user = _seed_user(session)
    token = _login(client, user.email)
    r = client.get(
        "/market/chart-data",
        params={"asset": "FAKE/USDT", "timeframe": "1d"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 404


def test_feat_100_chart_data_invalid_timeframe(client: TestClient, session: Session):
    user = _seed_user(session)
    token = _login(client, user.email)
    r = client.get(
        "/market/chart-data",
        params={"asset": "BTC/USDT", "timeframe": "1m"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400


def test_feat_100_chart_data_invalid_indicator(client: TestClient, session: Session):
    user = _seed_user(session)
    token = _login(client, user.email)
    r = client.get(
        "/market/chart-data",
        params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "bogus:5"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400


# --- Empty / data status --------------------------------------------------


def test_feat_100_chart_data_empty_state(client: TestClient, session: Session):
    user = _seed_user(session)
    token = _login(client, user.email)
    r = client.get(
        "/market/chart-data",
        params={"asset": "BTC/USDT", "timeframe": "1d"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["candles"] == []
    assert body["data_status"]["has_candles"] is False


def test_feat_100_chart_data_empty_state_date_range(client: TestClient, session: Session):
    """Candles exist for the asset/timeframe but fall outside the requested range."""
    user = _seed_user(session)
    _seed_candles(session, count=10)  # seeds 2026-01-01 through 2026-01-10
    token = _login(client, user.email)
    r = client.get(
        "/market/chart-data",
        params={
            "asset": "BTC/USDT",
            "timeframe": "1d",
            "start": "2025-01-01T00:00:00Z",
            "end": "2025-12-31T23:59:59Z",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["candles"] == []
    assert body["data_status"]["has_candles"] is False
    # Global availability bounds are still populated so the header can guide the user.
    assert body["data_status"]["earliest_candle"] is not None
    assert body["data_status"]["latest_candle"] is not None


# --- TC-05 EMA(20) on price pane, timestamps aligned ----------------------


def test_feat_100_ema_20_price_pane_aligned(client: TestClient, session: Session):
    user = _seed_user(session)
    timestamps = _seed_candles(session, count=40)
    token = _login(client, user.email)

    r = client.get(
        "/market/chart-data",
        params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "ema:20"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()

    assert len(body["candles"]) == len(timestamps)
    [ema_series] = body["indicators"]
    assert ema_series["key"] == "ema"
    assert ema_series["label"] == "EMA(20)"
    assert ema_series["pane"] == "price"
    assert ema_series["parameters"] == {"period": 20}

    candle_ts = [c["timestamp"] for c in body["candles"]]
    point_ts = [p["timestamp"] for p in ema_series["points"]]
    assert candle_ts == point_ts

    # Late EMA values must be present (warm-up has passed)
    assert ema_series["points"][-1]["value"] is not None


# --- TC-06 RSI(14) on oscillator pane, timestamps aligned -----------------


def test_feat_100_rsi_14_oscillator_pane_aligned(client: TestClient, session: Session):
    user = _seed_user(session)
    timestamps = _seed_candles(session, count=40)
    token = _login(client, user.email)

    r = client.get(
        "/market/chart-data",
        params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "rsi:14"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    [rsi_series] = body["indicators"]

    assert rsi_series["key"] == "rsi"
    assert rsi_series["label"] == "RSI(14)"
    assert rsi_series["pane"] == "oscillator"

    candle_ts = [c["timestamp"] for c in body["candles"]]
    point_ts = [p["timestamp"] for p in rsi_series["points"]]
    assert candle_ts == point_ts
    assert len(rsi_series["points"]) == len(timestamps)


# --- TC-08 warm-up values are null, not zero ------------------------------


def test_feat_100_warmup_values_are_null(client: TestClient, session: Session):
    user = _seed_user(session)
    _seed_candles(session, count=40)
    token = _login(client, user.email)

    r = client.get(
        "/market/chart-data",
        params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "rsi:14"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    [rsi_series] = r.json()["indicators"]

    # First N points (RSI(14) warm-up) must be null, never 0.0.
    for p in rsi_series["points"][:14]:
        assert p["value"] is None
    # Sanity: at least some later values are real numbers.
    assert any(p["value"] is not None for p in rsi_series["points"][14:])


# --- Multi-output indicator polish ----------------------------------------


def test_feat_100_macd_returns_three_series(client: TestClient, session: Session):
    user = _seed_user(session)
    _seed_candles(session, count=60)
    token = _login(client, user.email)

    r = client.get(
        "/market/chart-data",
        params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "macd"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    keys = [s["key"] for s in r.json()["indicators"]]
    assert keys == ["macd", "macd_signal", "macd_hist"]


def test_feat_100_bollinger_returns_three_series(client: TestClient, session: Session):
    user = _seed_user(session)
    _seed_candles(session, count=40)
    token = _login(client, user.email)

    r = client.get(
        "/market/chart-data",
        params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "bollinger:20"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    series = r.json()["indicators"]
    assert [s["key"] for s in series] == [
        "bollinger_upper", "bollinger_middle", "bollinger_lower"
    ]
    assert all(s["pane"] == "price" for s in series)
