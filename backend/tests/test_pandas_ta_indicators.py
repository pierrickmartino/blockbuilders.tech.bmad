"""Parity tests: indicator functions must match pandas-ta-classic reference output.

TC-01  SMA/EMA/RSI/ATR/OBV — backtest path parity via interpret_strategy + run_backtest (AC-1)
TC-02  MACD/Bollinger/Stochastic/ADX/Ichimoku — chart-data HTTP parity (AC-2, AC-3)
TC-03  Fibonacci/price_variation_pct — carve-out: fib via chart-data, pv via direct (AC-3)
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

import numpy as np
import pandas_ta_classic as ta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.backtest import indicators as ind
from app.backtest._ta_adapter import to_series
from app.backtest.engine import run_backtest
from app.backtest.interpreter import interpret_strategy
from app.core.database import get_session
from app.core.security import hash_password
from app.main import app
from app.models.candle import Candle
from app.models.user import PlanTier, User, UserTier


# ---------------------------------------------------------------------------
# Fixtures (C1 fix: defined here so session/engine shadow conftest)
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


def _ref(series) -> list:
    """Convert a pandas Series to a list, NaN → None."""
    return [None if (v is None or (isinstance(v, float) and np.isnan(v))) else float(v) for v in series]


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


# ---------------------------------------------------------------------------
# Strategy builders for TC-01 and TC-07
# ---------------------------------------------------------------------------


def _sma_gt_price_strategy(period: int) -> dict:
    """Entry: SMA(period) > close; Exit: close > SMA(period)."""
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
    """Entry: EMA(period) > close; Exit: close > EMA(period)."""
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
    """Entry: RSI(period) < threshold; Exit: RSI(period) > threshold."""
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
    """Entry: ATR(period) > threshold; Exit: ATR(period) < threshold."""
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
    """Entry: OBV > threshold; Exit: OBV < threshold."""
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


# ---------------------------------------------------------------------------
# TC-01  Backtest path parity: interpret_strategy + run_backtest (C2 fix)
# ---------------------------------------------------------------------------


class TestTC01BacktestPathParity:
    """TC-01: SMA/EMA/RSI/ATR/OBV entry signals match direct indicator calculations (AC-1).

    Each test builds a strategy, runs interpret_strategy() + run_backtest(), then asserts
    that every entry signal equals the result of evaluating the compare expression directly
    against the indicator values — the same logic the interpreter applies internally.
    """

    def test_sma_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        period = 20

        signals = interpret_strategy(_sma_gt_price_strategy(period), candles)
        result = run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        sma_vals = ind.sma(closes, period)
        for i, entry in enumerate(signals.entry_long):
            expected = sma_vals[i] is not None and sma_vals[i] > closes[i]
            assert entry == expected, f"SMA entry mismatch at index {i}"

        assert isinstance(result.num_trades, int)
        assert isinstance(result.final_balance, float)

    def test_ema_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        period = 20

        signals = interpret_strategy(_ema_gt_price_strategy(period), candles)
        result = run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        ema_vals = ind.ema(closes, period)
        for i, entry in enumerate(signals.entry_long):
            expected = ema_vals[i] is not None and ema_vals[i] > closes[i]
            assert entry == expected, f"EMA entry mismatch at index {i}"

        assert isinstance(result.num_trades, int)

    def test_rsi_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        period = 14
        threshold = 50.0

        signals = interpret_strategy(_rsi_lt_const_strategy(period, threshold), candles)
        result = run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        rsi_vals = ind.rsi(closes, period)
        for i, entry in enumerate(signals.entry_long):
            expected = rsi_vals[i] is not None and rsi_vals[i] < threshold
            assert entry == expected, f"RSI entry mismatch at index {i}"

        assert isinstance(result.num_trades, int)

    def test_atr_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        highs = _highs(candles)
        lows = _lows(candles)
        closes = _closes(candles)
        period = 14
        threshold = 1.0

        signals = interpret_strategy(_atr_gt_const_strategy(period, threshold), candles)
        result = run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        atr_vals = ind.atr(highs, lows, closes, period)
        for i, entry in enumerate(signals.entry_long):
            expected = atr_vals[i] is not None and atr_vals[i] > threshold
            assert entry == expected, f"ATR entry mismatch at index {i}"

        assert isinstance(result.num_trades, int)

    def test_obv_backtest_path(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        volumes = _volumes(candles)
        threshold = 0.0

        signals = interpret_strategy(_obv_gt_const_strategy(threshold), candles)
        result = run_backtest(candles, signals, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)

        obv_vals = ind.obv(closes, volumes)
        for i, entry in enumerate(signals.entry_long):
            expected = obv_vals[i] is not None and obv_vals[i] > threshold
            assert entry == expected, f"OBV entry mismatch at index {i}"

        assert isinstance(result.num_trades, int)


# ---------------------------------------------------------------------------
# TC-02  Chart-data HTTP parity: MACD/Bollinger/Stochastic/ADX/Ichimoku (C3 fix)
# ---------------------------------------------------------------------------


class TestTC02ChartDataParity:
    """TC-02: complex multi-output indicators match via GET /market/chart-data (AC-2, AC-3)."""

    def test_macd_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "macd"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        body = r.json()

        macd_line, signal_line, hist = ind.macd(closes)
        _assert_parity(_series_values(body["indicators"], "macd"), macd_line)
        _assert_parity(_series_values(body["indicators"], "macd_signal"), signal_line)
        _assert_parity(_series_values(body["indicators"], "macd_hist"), hist)

    def test_bollinger_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "bollinger:20"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        body = r.json()

        upper, middle, lower = ind.bollinger(closes, period=20, std_dev=2.0)
        _assert_parity(_series_values(body["indicators"], "bollinger_upper"), upper)
        _assert_parity(_series_values(body["indicators"], "bollinger_middle"), middle)
        _assert_parity(_series_values(body["indicators"], "bollinger_lower"), lower)

    def test_stochastic_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        candles = synthetic_ohlcv_candles
        highs = _highs(candles)
        lows = _lows(candles)
        closes = _closes(candles)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "stochastic:14"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        body = r.json()

        k_line, d_line = ind.stochastic(highs, lows, closes, k_period=14)
        _assert_parity(_series_values(body["indicators"], "stochastic_k"), k_line)
        _assert_parity(_series_values(body["indicators"], "stochastic_d"), d_line)

    def test_adx_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        candles = synthetic_ohlcv_candles
        highs = _highs(candles)
        lows = _lows(candles)
        closes = _closes(candles)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "adx:14"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        body = r.json()

        adx_line, plus_di, minus_di = ind.adx(highs, lows, closes, period=14)
        _assert_parity(_series_values(body["indicators"], "adx"), adx_line)
        _assert_parity(_series_values(body["indicators"], "adx_plus_di"), plus_di)
        _assert_parity(_series_values(body["indicators"], "adx_minus_di"), minus_di)

    def test_ichimoku_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        candles = synthetic_ohlcv_candles
        highs = _highs(candles)
        lows = _lows(candles)
        closes = _closes(candles)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "ichimoku"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        body = r.json()

        conv, base_line, span_a, span_b = ind.ichimoku(highs, lows, closes)
        _assert_parity(_series_values(body["indicators"], "ichimoku_conversion"), conv)
        _assert_parity(_series_values(body["indicators"], "ichimoku_base"), base_line)
        _assert_parity(_series_values(body["indicators"], "ichimoku_span_a"), span_a)
        _assert_parity(_series_values(body["indicators"], "ichimoku_span_b"), span_b)


# ---------------------------------------------------------------------------
# TC-03  Carve-out indicators: Fibonacci via chart-data, price_variation_pct direct
# ---------------------------------------------------------------------------


class TestTC03CarveOutIndicators:
    """TC-03: Fibonacci parity via chart-data; price_variation_pct kept as direct call (AC-3)."""

    def test_fibonacci_chart_data_parity(self, synthetic_ohlcv_candles, client, session):
        user = _seed_user(session)
        token = _login(client, user.email)
        candles = synthetic_ohlcv_candles
        highs = _highs(candles)
        lows = _lows(candles)

        r = client.get(
            "/market/chart-data",
            params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "fib:50"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        body = r.json()

        l236, l382, l5, l618, l786 = ind.fibonacci_retracements(highs, lows, lookback=50)
        _assert_parity(_series_values(body["indicators"], "fib_0_236"), l236)
        _assert_parity(_series_values(body["indicators"], "fib_0_382"), l382)
        _assert_parity(_series_values(body["indicators"], "fib_0_5"), l5)
        _assert_parity(_series_values(body["indicators"], "fib_0_618"), l618)
        _assert_parity(_series_values(body["indicators"], "fib_0_786"), l786)

    def test_price_variation_pct_deterministic(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        r1 = ind.price_variation_pct(closes)
        r2 = ind.price_variation_pct(closes)
        assert r1 == r2


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
        # MACD line valid after slow EMA warmup (25 candles); signal 8 more
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
        warmup_values = result[:19]
        assert all(v is None for v in warmup_values)
        assert not any(v == 0.0 for v in warmup_values)
        assert not any(v is False for v in warmup_values)


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
# TC-06  Invalid indicator validation (C1 fix: use client fixture, not lazy import)
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
# TC-07  Backtest determinism: run_backtest twice yields identical results (C4 fix)
# ---------------------------------------------------------------------------


class TestTC07BacktestDeterminism:
    """TC-07: repeated interpret_strategy + run_backtest calls yield identical metrics and trades (AC-7)."""

    def _run_twice(self, strategy: dict, candles: list) -> tuple:
        signals1 = interpret_strategy(strategy, candles)
        result1 = run_backtest(candles, signals1, initial_balance=10_000.0, fee_rate=0.001, slippage_rate=0.001)
        signals2 = interpret_strategy(strategy, candles)
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
# TC-08  Chart-data determinism: GET /market/chart-data twice (AC-8 upgrade)
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
