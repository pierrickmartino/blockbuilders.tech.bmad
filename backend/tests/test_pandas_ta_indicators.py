"""Parity tests: indicator functions must match pandas-ta-classic reference output.

TC-01  ALL strategy indicators — backtest path parity via interpret_strategy + run_backtest (AC-1)
         Reference: raw pandas_ta_classic calls, bypassing ind.* wrappers entirely
TC-02  Single-series indicators (SMA/EMA/RSI/ATR/OBV) — chart-data HTTP parity (AC-2)
         Reference: raw pandas_ta_classic calls, independent of ind.* wrappers
TC-03  Multi-series indicators (MACD/Bollinger/Stochastic/ADX/Ichimoku/Fibonacci) — chart-data HTTP parity (AC-3)
         Reference: raw pandas_ta_classic calls or pure-math formula for custom indicators
TC-04  Warmup contract: indices before min_periods return None (AC-4)
TC-05  Timestamp alignment: same indicator output regardless of caller (AC-5)
TC-06  Invalid indicator key → 400 (AC-6)
TC-07  Backtest determinism: run_backtest twice yields identical results (AC-7)
TC-08  Chart-data determinism: GET /market/chart-data twice yields identical results (AC-8)
"""
import os

# Must be set before any app import so Settings() reads the in-memory value,
# not the pytest.ini file-based sqlite:///./test.db value.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"

from uuid import uuid4

import pandas_ta_classic as ta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.backtest import indicators as ind
from app.backtest._ta_adapter import from_series, to_series
from app.backtest.engine import run_backtest
from app.backtest.interpreter import interpret_strategy
from app.backtest.types import RiskParams, ValidatedStrategy
from app.core.database import get_session
from app.core.security import hash_password
from app.main import app
from app.models.user import PlanTier, User, UserTier


# ---------------------------------------------------------------------------
# Fixtures (defined here so session/engine shadow conftest for isolation)
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


@pytest.fixture(name="client")
def client_fixture(session):
    def _override():
        return session

    app.dependency_overrides[get_session] = _override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


def _seed_user(session: Session) -> User:
    user = User(
        id=uuid4(),
        email="parity@test.com",
        password_hash=hash_password("Test1234!"),
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _login(client: TestClient, email: str) -> str:
    r = client.post("/auth/login", json={"email": email, "password": "Test1234!"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _series_values(indicators_list: list, key: str) -> list:
    """Extract point values for a named series from chart-data response."""
    for s in indicators_list:
        if s["key"] == key:
            return [p["value"] for p in s["points"]]
    raise AssertionError(f"Series key '{key}' not found in {[s['key'] for s in indicators_list]}")


# ---------------------------------------------------------------------------
# Indicator helpers
# ---------------------------------------------------------------------------


def _closes(candles):
    return [c.close for c in candles]


def _highs(candles):
    return [c.high for c in candles]


def _lows(candles):
    return [c.low for c in candles]


def _volumes(candles):
    return [c.volume for c in candles]


def _approx(val, ref_val):
    if ref_val is None:
        return val is None
    if val is None:
        return False
    return val == pytest.approx(ref_val, rel=1e-9, abs=1e-9)


def _assert_parity(actual: list, reference: list):
    assert len(actual) == len(reference), f"Length mismatch: {len(actual)} vs {len(reference)}"
    for i, (a, r) in enumerate(zip(actual, reference)):
        assert _approx(a, r), f"Index {i}: actual={a} ref={r}"


def _fib_ref(highs: list, lows: list, lookback: int = 50) -> dict:
    """Pure-math reference for Fibonacci retracements, independent of ind.fibonacci_retracements."""
    n = len(highs)
    levels = {"0_236": 0.236, "0_382": 0.382, "0_5": 0.5, "0_618": 0.618, "0_786": 0.786}
    result: dict = {k: [None] * n for k in levels}
    for i in range(lookback - 1, n):
        window_h = highs[i - lookback + 1 : i + 1]
        window_l = lows[i - lookback + 1 : i + 1]
        highest = max(window_h)
        lowest = min(window_l)
        r = highest - lowest
        for key, level in levels.items():
            result[key][i] = lowest if r == 0 else highest - r * level
    return result


def _pv_pct_ref(closes: list) -> list:
    """Pure-math reference for price_variation_pct, independent of ind.price_variation_pct."""
    n = len(closes)
    if n == 0:
        return []
    ref: list = [None]
    for i in range(1, n):
        if closes[i] is None or closes[i - 1] is None or closes[i - 1] == 0:
            ref.append(None)
        else:
            ref.append(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100)
    return ref


# ---------------------------------------------------------------------------
# Strategy helpers
# ---------------------------------------------------------------------------


def _to_validated_strategy(definition: dict) -> ValidatedStrategy:
    """Convert a raw definition dict (legacy from/to or from_port/to_port) to ValidatedStrategy."""
    blocks = tuple(definition.get("blocks", []))
    conns = []
    for conn in definition.get("connections", []):
        from_data = conn.get("from_port") or conn.get("from", {})
        to_data = conn.get("to_port") or conn.get("to", {})
        conns.append({
            "from_port": {"block_id": from_data.get("block_id"), "port": from_data.get("port", "output")},
            "to_port": {"block_id": to_data.get("block_id"), "port": to_data.get("port", "input")},
        })
    return ValidatedStrategy(blocks=blocks, connections=tuple(conns), risk_params=RiskParams())


# ---------------------------------------------------------------------------
# Strategy builders for TC-01 and TC-07
# ---------------------------------------------------------------------------


def _sma_gt_price_strategy(period: int) -> dict:
    return {
        "blocks": [
            {"id": "sma1", "type": "sma", "params": {"period": period}},
            {"id": "price1", "type": "price", "params": {"source": "close"}},
            {"id": "cmp_e", "type": "compare", "params": {"operator": ">"}},
            {"id": "cmp_x", "type": "compare", "params": {"operator": ">"}},
            {"id": "entry1", "type": "entry_signal", "params": {}},
            {"id": "exit1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "sma1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "left"}},
            {"from": {"block_id": "price1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "right"}},
            {"from": {"block_id": "cmp_e", "port": "output"}, "to": {"block_id": "entry1", "port": "signal"}},
            {"from": {"block_id": "price1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "left"}},
            {"from": {"block_id": "sma1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "right"}},
            {"from": {"block_id": "cmp_x", "port": "output"}, "to": {"block_id": "exit1", "port": "signal"}},
        ],
    }


def _ema_gt_price_strategy(period: int) -> dict:
    return {
        "blocks": [
            {"id": "ema1", "type": "ema", "params": {"period": period}},
            {"id": "price1", "type": "price", "params": {"source": "close"}},
            {"id": "cmp_e", "type": "compare", "params": {"operator": ">"}},
            {"id": "cmp_x", "type": "compare", "params": {"operator": ">"}},
            {"id": "entry1", "type": "entry_signal", "params": {}},
            {"id": "exit1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "ema1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "left"}},
            {"from": {"block_id": "price1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "right"}},
            {"from": {"block_id": "cmp_e", "port": "output"}, "to": {"block_id": "entry1", "port": "signal"}},
            {"from": {"block_id": "price1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "left"}},
            {"from": {"block_id": "ema1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "right"}},
            {"from": {"block_id": "cmp_x", "port": "output"}, "to": {"block_id": "exit1", "port": "signal"}},
        ],
    }


def _rsi_lt_const_strategy(period: int, threshold: float) -> dict:
    return {
        "blocks": [
            {"id": "rsi1", "type": "rsi", "params": {"period": period}},
            {"id": "const1", "type": "constant", "params": {"value": threshold}},
            {"id": "cmp_e", "type": "compare", "params": {"operator": "<"}},
            {"id": "cmp_x", "type": "compare", "params": {"operator": ">"}},
            {"id": "entry1", "type": "entry_signal", "params": {}},
            {"id": "exit1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "rsi1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "right"}},
            {"from": {"block_id": "cmp_e", "port": "output"}, "to": {"block_id": "entry1", "port": "signal"}},
            {"from": {"block_id": "rsi1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "right"}},
            {"from": {"block_id": "cmp_x", "port": "output"}, "to": {"block_id": "exit1", "port": "signal"}},
        ],
    }


def _atr_gt_const_strategy(period: int, threshold: float) -> dict:
    return {
        "blocks": [
            {"id": "atr1", "type": "atr", "params": {"period": period}},
            {"id": "const1", "type": "constant", "params": {"value": threshold}},
            {"id": "cmp_e", "type": "compare", "params": {"operator": ">"}},
            {"id": "cmp_x", "type": "compare", "params": {"operator": "<"}},
            {"id": "entry1", "type": "entry_signal", "params": {}},
            {"id": "exit1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "atr1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "right"}},
            {"from": {"block_id": "cmp_e", "port": "output"}, "to": {"block_id": "entry1", "port": "signal"}},
            {"from": {"block_id": "atr1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "right"}},
            {"from": {"block_id": "cmp_x", "port": "output"}, "to": {"block_id": "exit1", "port": "signal"}},
        ],
    }


def _obv_gt_const_strategy(threshold: float) -> dict:
    return {
        "blocks": [
            {"id": "obv1", "type": "obv", "params": {}},
            {"id": "const1", "type": "constant", "params": {"value": threshold}},
            {"id": "cmp_e", "type": "compare", "params": {"operator": ">"}},
            {"id": "cmp_x", "type": "compare", "params": {"operator": "<"}},
            {"id": "entry1", "type": "entry_signal", "params": {}},
            {"id": "exit1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "obv1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "right"}},
            {"from": {"block_id": "cmp_e", "port": "output"}, "to": {"block_id": "entry1", "port": "signal"}},
            {"from": {"block_id": "obv1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "right"}},
            {"from": {"block_id": "cmp_x", "port": "output"}, "to": {"block_id": "exit1", "port": "signal"}},
        ],
    }


def _macd_gt_const_strategy(threshold: float = 0.0) -> dict:
    """Entry: MACD line (default output port) > threshold."""
    return {
        "blocks": [
            {"id": "macd1", "type": "macd", "params": {"fast_period": 12, "slow_period": 26, "signal_period": 9}},
            {"id": "const1", "type": "constant", "params": {"value": threshold}},
            {"id": "cmp_e", "type": "compare", "params": {"operator": ">"}},
            {"id": "cmp_x", "type": "compare", "params": {"operator": "<"}},
            {"id": "entry1", "type": "entry_signal", "params": {}},
            {"id": "exit1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "macd1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "right"}},
            {"from": {"block_id": "cmp_e", "port": "output"}, "to": {"block_id": "entry1", "port": "signal"}},
            {"from": {"block_id": "macd1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "right"}},
            {"from": {"block_id": "cmp_x", "port": "output"}, "to": {"block_id": "exit1", "port": "signal"}},
        ],
    }


def _bollinger_middle_gt_price_strategy(period: int = 20) -> dict:
    """Entry: Bollinger middle band (default output port) > close."""
    return {
        "blocks": [
            {"id": "bb1", "type": "bollinger", "params": {"period": period, "stddev": 2.0}},
            {"id": "price1", "type": "price", "params": {"source": "close"}},
            {"id": "cmp_e", "type": "compare", "params": {"operator": ">"}},
            {"id": "cmp_x", "type": "compare", "params": {"operator": ">"}},
            {"id": "entry1", "type": "entry_signal", "params": {}},
            {"id": "exit1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "bb1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "left"}},
            {"from": {"block_id": "price1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "right"}},
            {"from": {"block_id": "cmp_e", "port": "output"}, "to": {"block_id": "entry1", "port": "signal"}},
            {"from": {"block_id": "price1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "left"}},
            {"from": {"block_id": "bb1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "right"}},
            {"from": {"block_id": "cmp_x", "port": "output"}, "to": {"block_id": "exit1", "port": "signal"}},
        ],
    }


def _stochastic_k_lt_const_strategy(k_period: int = 14, threshold: float = 30.0) -> dict:
    """Entry: Stochastic %K (default output port) < threshold."""
    return {
        "blocks": [
            {"id": "stoch1", "type": "stochastic", "params": {"k_period": k_period, "d_period": 3, "smooth": 3}},
            {"id": "const1", "type": "constant", "params": {"value": threshold}},
            {"id": "cmp_e", "type": "compare", "params": {"operator": "<"}},
            {"id": "cmp_x", "type": "compare", "params": {"operator": ">"}},
            {"id": "entry1", "type": "entry_signal", "params": {}},
            {"id": "exit1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "stoch1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "right"}},
            {"from": {"block_id": "cmp_e", "port": "output"}, "to": {"block_id": "entry1", "port": "signal"}},
            {"from": {"block_id": "stoch1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "right"}},
            {"from": {"block_id": "cmp_x", "port": "output"}, "to": {"block_id": "exit1", "port": "signal"}},
        ],
    }


def _adx_gt_const_strategy(period: int = 14, threshold: float = 25.0) -> dict:
    """Entry: ADX (default output port) > threshold."""
    return {
        "blocks": [
            {"id": "adx1", "type": "adx", "params": {"period": period}},
            {"id": "const1", "type": "constant", "params": {"value": threshold}},
            {"id": "cmp_e", "type": "compare", "params": {"operator": ">"}},
            {"id": "cmp_x", "type": "compare", "params": {"operator": "<"}},
            {"id": "entry1", "type": "entry_signal", "params": {}},
            {"id": "exit1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "adx1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "right"}},
            {"from": {"block_id": "cmp_e", "port": "output"}, "to": {"block_id": "entry1", "port": "signal"}},
            {"from": {"block_id": "adx1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "right"}},
            {"from": {"block_id": "cmp_x", "port": "output"}, "to": {"block_id": "exit1", "port": "signal"}},
        ],
    }


def _ichimoku_conv_gt_const_strategy(threshold: float) -> dict:
    """Entry: Ichimoku conversion line (default output port) > threshold."""
    return {
        "blocks": [
            {"id": "ich1", "type": "ichimoku", "params": {"conversion": 9, "base": 26, "span_b": 52, "displacement": 26}},
            {"id": "const1", "type": "constant", "params": {"value": threshold}},
            {"id": "cmp_e", "type": "compare", "params": {"operator": ">"}},
            {"id": "cmp_x", "type": "compare", "params": {"operator": "<"}},
            {"id": "entry1", "type": "entry_signal", "params": {}},
            {"id": "exit1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "ich1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "right"}},
            {"from": {"block_id": "cmp_e", "port": "output"}, "to": {"block_id": "entry1", "port": "signal"}},
            {"from": {"block_id": "ich1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "right"}},
            {"from": {"block_id": "cmp_x", "port": "output"}, "to": {"block_id": "exit1", "port": "signal"}},
        ],
    }


def _fibonacci_l5_gt_price_strategy(lookback: int = 50) -> dict:
    """Entry: Fibonacci 0.5 level (default output port) > close."""
    return {
        "blocks": [
            {"id": "fib1", "type": "fibonacci", "params": {"lookback": lookback}},
            {"id": "price1", "type": "price", "params": {"source": "close"}},
            {"id": "cmp_e", "type": "compare", "params": {"operator": ">"}},
            {"id": "cmp_x", "type": "compare", "params": {"operator": ">"}},
            {"id": "entry1", "type": "entry_signal", "params": {}},
            {"id": "exit1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "fib1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "left"}},
            {"from": {"block_id": "price1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "right"}},
            {"from": {"block_id": "cmp_e", "port": "output"}, "to": {"block_id": "entry1", "port": "signal"}},
            {"from": {"block_id": "price1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "left"}},
            {"from": {"block_id": "fib1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "right"}},
            {"from": {"block_id": "cmp_x", "port": "output"}, "to": {"block_id": "exit1", "port": "signal"}},
        ],
    }


def _pv_pct_gt_const_strategy(threshold: float = 0.0) -> dict:
    """Entry: price_variation_pct > threshold."""
    return {
        "blocks": [
            {"id": "pv1", "type": "price_variation_pct", "params": {}},
            {"id": "const1", "type": "constant", "params": {"value": threshold}},
            {"id": "cmp_e", "type": "compare", "params": {"operator": ">"}},
            {"id": "cmp_x", "type": "compare", "params": {"operator": "<"}},
            {"id": "entry1", "type": "entry_signal", "params": {}},
            {"id": "exit1", "type": "exit_signal", "params": {}},
        ],
        "connections": [
            {"from": {"block_id": "pv1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_e", "port": "right"}},
            {"from": {"block_id": "cmp_e", "port": "output"}, "to": {"block_id": "entry1", "port": "signal"}},
            {"from": {"block_id": "pv1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "left"}},
            {"from": {"block_id": "const1", "port": "output"}, "to": {"block_id": "cmp_x", "port": "right"}},
            {"from": {"block_id": "cmp_x", "port": "output"}, "to": {"block_id": "exit1", "port": "signal"}},
        ],
    }


# ---------------------------------------------------------------------------
# TC-01  Backtest path parity for ALL strategy indicators (M1 fix)
#        Reference: raw pandas_ta_classic, bypassing ind.* wrappers
# ---------------------------------------------------------------------------


class TestTC01BacktestPathParity:
    """TC-01: every strategy indicator entry signal matches raw pandas-ta-classic output (AC-1).

    Each test builds a strategy, runs interpret_strategy() + run_backtest(), then checks that
    every entry_long[i] equals the compare expression evaluated directly against raw ta.* output
    — bypassing ind.* wrappers so that wrapper-layer bugs are detectable.
    """

    def test_sma_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        period = 20
        n = len(closes)

        signals = interpret_strategy(_to_validated_strategy(_sma_gt_price_strategy(period)), candles)
        run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        ref = from_series(ta.sma(to_series(closes), length=period), n)
        for i, entry in enumerate(signals.entry_long):
            expected = ref[i] is not None and ref[i] > closes[i]
            assert entry == expected, f"SMA entry mismatch at index {i}"

    def test_ema_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        period = 20
        n = len(closes)

        signals = interpret_strategy(_to_validated_strategy(_ema_gt_price_strategy(period)), candles)
        run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        ref = from_series(ta.ema(to_series(closes), length=period), n)
        for i, entry in enumerate(signals.entry_long):
            expected = ref[i] is not None and ref[i] > closes[i]
            assert entry == expected, f"EMA entry mismatch at index {i}"

    def test_rsi_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        period = 14
        threshold = 50.0
        n = len(closes)

        signals = interpret_strategy(_to_validated_strategy(_rsi_lt_const_strategy(period, threshold)), candles)
        run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        ref = from_series(ta.rsi(to_series(closes), length=period), n)
        for i, entry in enumerate(signals.entry_long):
            expected = ref[i] is not None and ref[i] < threshold
            assert entry == expected, f"RSI entry mismatch at index {i}"

    def test_atr_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        highs = _highs(candles)
        lows = _lows(candles)
        closes = _closes(candles)
        period = 14
        threshold = 1.0
        n = len(closes)

        signals = interpret_strategy(_to_validated_strategy(_atr_gt_const_strategy(period, threshold)), candles)
        run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        ref = from_series(ta.atr(to_series(highs), to_series(lows), to_series(closes), length=period), n)
        for i, entry in enumerate(signals.entry_long):
            expected = ref[i] is not None and ref[i] > threshold
            assert entry == expected, f"ATR entry mismatch at index {i}"

    def test_obv_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        volumes = _volumes(candles)
        threshold = 0.0
        n = len(closes)

        signals = interpret_strategy(_to_validated_strategy(_obv_gt_const_strategy(threshold)), candles)
        run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        ref = from_series(ta.obv(to_series(closes), to_series(volumes)), n)
        for i, entry in enumerate(signals.entry_long):
            expected = ref[i] is not None and ref[i] > threshold
            assert entry == expected, f"OBV entry mismatch at index {i}"

    def test_macd_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        threshold = 0.0
        n = len(closes)

        signals = interpret_strategy(_to_validated_strategy(_macd_gt_const_strategy(threshold)), candles)
        run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        df = ta.macd(to_series(closes), fast=12, slow=26, signal=9)
        ref = from_series(df["MACD_12_26_9"], n)
        for i, entry in enumerate(signals.entry_long):
            expected = ref[i] is not None and ref[i] > threshold
            assert entry == expected, f"MACD entry mismatch at index {i}"

    def test_bollinger_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        period = 20
        n = len(closes)

        signals = interpret_strategy(_to_validated_strategy(_bollinger_middle_gt_price_strategy(period)), candles)
        run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        df = ta.bbands(to_series(closes), length=period, std=2.0)
        middle_col = next(c for c in df.columns if c.startswith(f"BBM_{period}_"))
        ref = from_series(df[middle_col], n)
        for i, entry in enumerate(signals.entry_long):
            expected = ref[i] is not None and ref[i] > closes[i]
            assert entry == expected, f"Bollinger middle entry mismatch at index {i}"

    def test_stochastic_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        highs = _highs(candles)
        lows = _lows(candles)
        closes = _closes(candles)
        threshold = 30.0
        n = len(closes)

        signals = interpret_strategy(_to_validated_strategy(_stochastic_k_lt_const_strategy(14, threshold)), candles)
        run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        df = ta.stoch(to_series(highs), to_series(lows), to_series(closes), k=14, d=3, smooth_k=3)
        ref = from_series(df["STOCHk_14_3_3"], n)
        for i, entry in enumerate(signals.entry_long):
            expected = ref[i] is not None and ref[i] < threshold
            assert entry == expected, f"Stochastic %K entry mismatch at index {i}"

    def test_adx_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        highs = _highs(candles)
        lows = _lows(candles)
        closes = _closes(candles)
        threshold = 25.0
        n = len(closes)

        signals = interpret_strategy(_to_validated_strategy(_adx_gt_const_strategy(14, threshold)), candles)
        run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        df = ta.adx(to_series(highs), to_series(lows), to_series(closes), length=14)
        ref = from_series(df["ADX_14"], n)
        for i, entry in enumerate(signals.entry_long):
            expected = ref[i] is not None and ref[i] > threshold
            assert entry == expected, f"ADX entry mismatch at index {i}"

    def test_ichimoku_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        highs = _highs(candles)
        lows = _lows(candles)
        closes = _closes(candles)
        n = len(closes)
        median_close = sorted(closes)[n // 2]

        signals = interpret_strategy(_to_validated_strategy(_ichimoku_conv_gt_const_strategy(median_close)), candles)
        run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        result = ta.ichimoku(to_series(highs), to_series(lows), to_series(closes), tenkan=9, kijun=26, senkou=52)
        ref = from_series(result[0]["ITS_9"], n)
        for i, entry in enumerate(signals.entry_long):
            expected = ref[i] is not None and ref[i] > median_close
            assert entry == expected, f"Ichimoku conversion entry mismatch at index {i}"

    def test_fibonacci_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        highs = _highs(candles)
        lows = _lows(candles)
        closes = _closes(candles)
        lookback = 50
        n = len(closes)

        signals = interpret_strategy(_to_validated_strategy(_fibonacci_l5_gt_price_strategy(lookback)), candles)
        run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        ref = _fib_ref(highs, lows, lookback)["0_5"]
        for i, entry in enumerate(signals.entry_long):
            expected = ref[i] is not None and ref[i] > closes[i]
            assert entry == expected, f"Fibonacci level_5 entry mismatch at index {i}"

    def test_price_variation_pct_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        threshold = 0.0
        n = len(closes)

        signals = interpret_strategy(_to_validated_strategy(_pv_pct_gt_const_strategy(threshold)), candles)
        run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        ref = _pv_pct_ref(closes)
        for i, entry in enumerate(signals.entry_long):
            expected = ref[i] is not None and ref[i] > threshold
            assert entry == expected, f"price_variation_pct entry mismatch at index {i}"


# ---------------------------------------------------------------------------
# TC-02  Single-series chart-data HTTP parity: SMA/EMA/RSI/ATR/OBV (M2 fix)
#        Reference: raw pandas_ta_classic, independent of ind.* wrappers
# ---------------------------------------------------------------------------


class TestTC02SingleSeriesChartDataParity:
    """TC-02: SMA/EMA/RSI/ATR/OBV chart-data response matches raw pandas-ta-classic output (AC-2)."""

    def test_sma_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        closes = _closes(synthetic_ohlcv_candles)
        n = len(closes)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "sma:20"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200

        ref = from_series(ta.sma(to_series(closes), length=20), n)
        _assert_parity(_series_values(r.json()["indicators"], "sma"), ref)

    def test_ema_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        closes = _closes(synthetic_ohlcv_candles)
        n = len(closes)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "ema:20"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200

        ref = from_series(ta.ema(to_series(closes), length=20), n)
        _assert_parity(_series_values(r.json()["indicators"], "ema"), ref)

    def test_rsi_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        closes = _closes(synthetic_ohlcv_candles)
        n = len(closes)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "rsi:14"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200

        ref = from_series(ta.rsi(to_series(closes), length=14), n)
        _assert_parity(_series_values(r.json()["indicators"], "rsi"), ref)

    def test_atr_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        n = len(closes)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "atr:14"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200

        ref = from_series(ta.atr(to_series(highs), to_series(lows), to_series(closes), length=14), n)
        _assert_parity(_series_values(r.json()["indicators"], "atr"), ref)

    def test_obv_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        closes = _closes(synthetic_ohlcv_candles)
        volumes = _volumes(synthetic_ohlcv_candles)
        n = len(closes)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "obv"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200

        ref = from_series(ta.obv(to_series(closes), to_series(volumes)), n)
        _assert_parity(_series_values(r.json()["indicators"], "obv"), ref)


# ---------------------------------------------------------------------------
# TC-03  Multi-series chart-data HTTP parity (M3 fix)
#        Reference: raw pandas_ta_classic; Fibonacci: pure-math formula
# ---------------------------------------------------------------------------


class TestTC03MultiSeriesChartDataParity:
    """TC-03: MACD/Bollinger/Stochastic/ADX/Ichimoku/Fibonacci chart-data response
    matches raw pandas-ta-classic output (AC-3).

    Reference values are computed directly via ta.* without going through ind.* wrappers,
    so a column-naming bug in any ind.* wrapper would be caught here.
    """

    def test_macd_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        closes = _closes(synthetic_ohlcv_candles)
        n = len(closes)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "macd"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        body = r.json()

        df = ta.macd(to_series(closes), fast=12, slow=26, signal=9)
        _assert_parity(_series_values(body["indicators"], "macd"), from_series(df["MACD_12_26_9"], n))
        _assert_parity(_series_values(body["indicators"], "macd_signal"), from_series(df["MACDs_12_26_9"], n))
        _assert_parity(_series_values(body["indicators"], "macd_hist"), from_series(df["MACDh_12_26_9"], n))

    def test_bollinger_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        closes = _closes(synthetic_ohlcv_candles)
        n = len(closes)
        period = 20

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "bollinger:20"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        body = r.json()

        df = ta.bbands(to_series(closes), length=period, std=2.0)
        upper_col = next(c for c in df.columns if c.startswith(f"BBU_{period}_"))
        middle_col = next(c for c in df.columns if c.startswith(f"BBM_{period}_"))
        lower_col = next(c for c in df.columns if c.startswith(f"BBL_{period}_"))
        _assert_parity(_series_values(body["indicators"], "bollinger_upper"), from_series(df[upper_col], n))
        _assert_parity(_series_values(body["indicators"], "bollinger_middle"), from_series(df[middle_col], n))
        _assert_parity(_series_values(body["indicators"], "bollinger_lower"), from_series(df[lower_col], n))

    def test_stochastic_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        n = len(closes)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "stochastic:14"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        body = r.json()

        df = ta.stoch(to_series(highs), to_series(lows), to_series(closes), k=14, d=3, smooth_k=3)
        _assert_parity(_series_values(body["indicators"], "stochastic_k"), from_series(df["STOCHk_14_3_3"], n))
        _assert_parity(_series_values(body["indicators"], "stochastic_d"), from_series(df["STOCHd_14_3_3"], n))

    def test_adx_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        n = len(closes)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "adx:14"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        body = r.json()

        df = ta.adx(to_series(highs), to_series(lows), to_series(closes), length=14)
        _assert_parity(_series_values(body["indicators"], "adx"), from_series(df["ADX_14"], n))
        _assert_parity(_series_values(body["indicators"], "adx_plus_di"), from_series(df["DMP_14"], n))
        _assert_parity(_series_values(body["indicators"], "adx_minus_di"), from_series(df["DMN_14"], n))

    def test_ichimoku_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        n = len(closes)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "ichimoku"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        body = r.json()

        result = ta.ichimoku(to_series(highs), to_series(lows), to_series(closes), tenkan=9, kijun=26, senkou=52)
        df = result[0]
        _assert_parity(_series_values(body["indicators"], "ichimoku_conversion"), from_series(df["ITS_9"], n))
        _assert_parity(_series_values(body["indicators"], "ichimoku_base"), from_series(df["IKS_26"], n))
        _assert_parity(_series_values(body["indicators"], "ichimoku_span_a"), from_series(df["ISA_9"], n))
        _assert_parity(_series_values(body["indicators"], "ichimoku_span_b"), from_series(df["ISB_26"], n))

    def test_fibonacci_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "fib:50"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        body = r.json()

        fib = _fib_ref(highs, lows, lookback=50)
        _assert_parity(_series_values(body["indicators"], "fib_0_236"), fib["0_236"])
        _assert_parity(_series_values(body["indicators"], "fib_0_382"), fib["0_382"])
        _assert_parity(_series_values(body["indicators"], "fib_0_5"), fib["0_5"])
        _assert_parity(_series_values(body["indicators"], "fib_0_618"), fib["0_618"])
        _assert_parity(_series_values(body["indicators"], "fib_0_786"), fib["0_786"])


# ---------------------------------------------------------------------------
# TC-04  Warmup → None contract (unchanged)
# ---------------------------------------------------------------------------


class TestTC04WarmupContract:
    """TC-04: indices before min_periods yield None, not 0 or False."""

    def test_sma_warmup_is_none(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        result = ind.sma(closes, period=20)
        for i in range(19):
            assert result[i] is None, f"sma[{i}] should be None during warmup"

    def test_ema_warmup_is_none(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        result = ind.ema(closes, period=20)
        for i in range(19):
            assert result[i] is None, f"ema[{i}] should be None during warmup"

    def test_rsi_warmup_is_none(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        result = ind.rsi(closes, period=14)
        for i in range(13):  # first valid at index period-1=13
            assert result[i] is None, f"rsi[{i}] should be None during warmup"

    def test_macd_warmup_is_none(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        macd_line, signal_line, _ = ind.macd(closes)
        for i in range(25):
            assert macd_line[i] is None, f"macd[{i}] should be None during warmup"
        for i in range(33):
            assert signal_line[i] is None, f"macd_signal[{i}] should be None during warmup"

    def test_atr_warmup_is_none(self, synthetic_ohlcv_candles):
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        result = ind.atr(highs, lows, closes, period=14)
        for i in range(13):  # first valid at index period-1=13
            assert result[i] is None, f"atr[{i}] should be None during warmup"

    def test_none_is_not_zero_or_false(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        result = ind.sma(closes, period=20)
        warmup = result[:19]
        assert all(v is None for v in warmup)
        assert not any(v == 0.0 for v in warmup)
        assert not any(v is False for v in warmup)


# ---------------------------------------------------------------------------
# TC-05  Timestamp alignment (unchanged)
# ---------------------------------------------------------------------------


class TestTC05TimestampAlignment:
    """TC-05: indicator output indices align to candle timestamps."""

    def test_sma_aligned_to_candle_timestamps(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        result = ind.sma(closes, period=20)
        assert len(result) == len(candles)
        for i, val in enumerate(result):
            if val is not None:
                assert i >= 19, f"Non-None SMA at warmup index {i}"

    def test_macd_and_sma_same_length(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        sma_result = ind.sma(closes, period=20)
        macd_line, _, _ = ind.macd(closes)
        assert len(sma_result) == len(macd_line) == len(closes)


# ---------------------------------------------------------------------------
# TC-06  Invalid indicator validation (uses client fixture, not lazy import)
# ---------------------------------------------------------------------------


class TestTC06InvalidIndicatorValidation:
    """TC-06: unsupported indicator key returns HTTP 400 (AC-6)."""

    def test_unsupported_indicator_returns_400(self, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "unknown_indicator"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 400
        assert "unsupported" in r.json()["detail"].lower()


# ---------------------------------------------------------------------------
# TC-07  Backtest determinism: run_backtest twice yields identical results
# ---------------------------------------------------------------------------


class TestTC07BacktestDeterminism:
    """TC-07: repeated interpret_strategy + run_backtest calls yield identical metrics and trades (AC-7)."""

    def _run_twice(self, strategy: dict, candles: list) -> tuple:
        validated = _to_validated_strategy(strategy)
        signals1 = interpret_strategy(validated, candles)
        result1 = run_backtest(candles, signals1, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)
        signals2 = interpret_strategy(validated, candles)
        result2 = run_backtest(candles, signals2, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)
        return result1, result2

    def _assert_results_equal(self, r1, r2):
        assert r1.num_trades == r2.num_trades
        assert r1.total_return_pct == r2.total_return_pct
        assert r1.final_balance == r2.final_balance
        assert r1.win_rate_pct == r2.win_rate_pct
        for t1, t2 in zip(r1.trades, r2.trades):
            assert t1.pnl == t2.pnl, f"trade pnl mismatch: {t1.pnl} vs {t2.pnl}"
            assert t1.entry_price == t2.entry_price
            assert t1.exit_price == t2.exit_price

    def test_sma_backtest_deterministic(self, synthetic_ohlcv_candles):
        r1, r2 = self._run_twice(_sma_gt_price_strategy(20), synthetic_ohlcv_candles)
        self._assert_results_equal(r1, r2)

    def test_rsi_backtest_deterministic(self, synthetic_ohlcv_candles):
        r1, r2 = self._run_twice(_rsi_lt_const_strategy(14, 50.0), synthetic_ohlcv_candles)
        self._assert_results_equal(r1, r2)

    def test_atr_backtest_deterministic(self, synthetic_ohlcv_candles):
        r1, r2 = self._run_twice(_atr_gt_const_strategy(14, 1.0), synthetic_ohlcv_candles)
        self._assert_results_equal(r1, r2)

    def test_obv_backtest_deterministic(self, synthetic_ohlcv_candles):
        r1, r2 = self._run_twice(_obv_gt_const_strategy(0.0), synthetic_ohlcv_candles)
        self._assert_results_equal(r1, r2)


# ---------------------------------------------------------------------------
# TC-08  Chart-data determinism: GET /market/chart-data twice (AC-8)
# ---------------------------------------------------------------------------


class TestTC08ChartDataDeterminism:
    """TC-08: repeated GET /market/chart-data calls yield identical series (AC-8)."""

    def _get_series(self, client, token, indicator_param):
        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": indicator_param},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        return r.json()["indicators"]

    def test_ema_chart_data_deterministic(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        s1 = self._get_series(client, token, "ema:20")
        s2 = self._get_series(client, token, "ema:20")
        assert _series_values(s1, "ema") == _series_values(s2, "ema")

    def test_rsi_chart_data_deterministic(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        s1 = self._get_series(client, token, "rsi:14")
        s2 = self._get_series(client, token, "rsi:14")
        assert _series_values(s1, "rsi") == _series_values(s2, "rsi")

    def test_obv_chart_data_deterministic(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        s1 = self._get_series(client, token, "obv")
        s2 = self._get_series(client, token, "obv")
        assert _series_values(s1, "obv") == _series_values(s2, "obv")

    def test_fibonacci_chart_data_deterministic(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        s1 = self._get_series(client, token, "fib:50")
        s2 = self._get_series(client, token, "fib:50")
        assert _series_values(s1, "fib_0_5") == _series_values(s2, "fib_0_5")
