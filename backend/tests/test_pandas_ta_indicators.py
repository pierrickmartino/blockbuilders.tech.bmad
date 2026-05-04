"""Parity tests: indicator functions must match pandas-ta-classic reference output.

TC-01  SMA/EMA/RSI/ATR/OBV — parity with ta reference (AC-1, AC-2)
TC-02  MACD/Bollinger/Stochastic/ADX/Ichimoku — parity with ta reference (AC-3)
TC-03  Fibonacci/price_variation_pct — kept-as-is, deterministic (AC-3 carve-out)
TC-04  Warmup contract: indices before min_periods return None (AC-4)
TC-05  Timestamp alignment: same indicator output regardless of caller (AC-5)
TC-06  Invalid indicator key → 400 (AC-6)
TC-07  Backtest determinism: repeated calls yield identical results (AC-7)
TC-08  Chart-data determinism: repeated calls yield identical results (AC-8)
"""
import pytest
import numpy as np
import pandas_ta_classic as ta
import pandas as pd

from app.backtest import indicators as ind
from app.backtest._ta_adapter import to_series


# ---------------------------------------------------------------------------
# Helpers
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
    """Convert a pandas Series to a list, NaN → None, for assertion."""
    return [None if (v is None or (isinstance(v, float) and np.isnan(v))) else float(v) for v in series]


def _approx(val, ref_val):
    """pytest.approx comparison that handles None sentinel."""
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
# TC-01  SMA / EMA / RSI / ATR / OBV parity
# ---------------------------------------------------------------------------

class TestTC01SimpleIndicatorParity:
    """TC-01: SMA, EMA, RSI, ATR, OBV match pandas-ta-classic reference."""

    def test_sma_parity(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        period = 20
        actual = ind.sma(closes, period)
        ref = _ref(ta.sma(to_series(closes), length=period))
        _assert_parity(actual, ref)

    def test_ema_parity(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        period = 20
        actual = ind.ema(closes, period)
        ref = _ref(ta.ema(to_series(closes), length=period))
        _assert_parity(actual, ref)

    def test_rsi_parity(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        period = 14
        actual = ind.rsi(closes, period)
        ref = _ref(ta.rsi(to_series(closes), length=period))
        _assert_parity(actual, ref)

    def test_atr_parity(self, synthetic_ohlcv_candles):
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        period = 14
        actual = ind.atr(highs, lows, closes, period)
        ref = _ref(ta.atr(to_series(highs), to_series(lows), to_series(closes), length=period))
        _assert_parity(actual, ref)

    def test_obv_parity(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        volumes = _volumes(synthetic_ohlcv_candles)
        actual = ind.obv(closes, volumes)
        ref = _ref(ta.obv(to_series(closes), to_series(volumes)))
        _assert_parity(actual, ref)


# ---------------------------------------------------------------------------
# TC-02  MACD / Bollinger / Stochastic / ADX / Ichimoku parity
# ---------------------------------------------------------------------------

class TestTC02ComplexIndicatorParity:
    """TC-02: MACD, Bollinger, Stochastic, ADX, Ichimoku match pandas-ta-classic reference."""

    def test_macd_parity(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        fast, slow, signal = 12, 26, 9
        macd_line, signal_line, histogram = ind.macd(closes, fast, slow, signal)
        df = ta.macd(to_series(closes), fast=fast, slow=slow, signal=signal)
        _assert_parity(macd_line, _ref(df[f"MACD_{fast}_{slow}_{signal}"]))
        _assert_parity(signal_line, _ref(df[f"MACDs_{fast}_{slow}_{signal}"]))
        _assert_parity(histogram, _ref(df[f"MACDh_{fast}_{slow}_{signal}"]))

    def test_bollinger_parity(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        period, std_dev = 20, 2.0
        upper, middle, lower = ind.bollinger(closes, period, std_dev)
        df = ta.bbands(to_series(closes), length=period, std=std_dev)
        std_str = f"{std_dev:.1f}"
        _assert_parity(upper, _ref(df[f"BBU_{period}_{std_str}"]))
        _assert_parity(middle, _ref(df[f"BBM_{period}_{std_str}"]))
        _assert_parity(lower, _ref(df[f"BBL_{period}_{std_str}"]))

    def test_stochastic_parity(self, synthetic_ohlcv_candles):
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        k, d, sm = 14, 3, 3
        actual_k, actual_d = ind.stochastic(highs, lows, closes, k, d, sm)
        df = ta.stoch(to_series(highs), to_series(lows), to_series(closes), k=k, d=d, smooth_k=sm)
        n = len(closes)
        ref_k = _ref(df[f"STOCHk_{k}_{d}_{sm}"].reindex(range(n)))
        ref_d = _ref(df[f"STOCHd_{k}_{d}_{sm}"].reindex(range(n)))
        _assert_parity(actual_k, ref_k)
        _assert_parity(actual_d, ref_d)

    def test_adx_parity(self, synthetic_ohlcv_candles):
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        period = 14
        adx_line, plus_di, minus_di = ind.adx(highs, lows, closes, period)
        df = ta.adx(to_series(highs), to_series(lows), to_series(closes), length=period)
        _assert_parity(adx_line, _ref(df[f"ADX_{period}"]))
        _assert_parity(plus_di, _ref(df[f"DMP_{period}"]))
        _assert_parity(minus_di, _ref(df[f"DMN_{period}"]))

    def test_ichimoku_parity(self, synthetic_ohlcv_candles):
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        conversion, base, span_b_p = 9, 26, 52
        conv, base_line, span_a, span_b = ind.ichimoku(highs, lows, closes, conversion, base, span_b_p)
        df = ta.ichimoku(to_series(highs), to_series(lows), to_series(closes), tenkan=conversion, kijun=base, senkou=span_b_p)[0]
        _assert_parity(conv, _ref(df[f"ITS_{conversion}"]))
        _assert_parity(base_line, _ref(df[f"IKS_{base}"]))
        _assert_parity(span_a, _ref(df[f"ISA_{conversion}"]))
        _assert_parity(span_b, _ref(df[f"ISB_{base}"]))


# ---------------------------------------------------------------------------
# TC-03  Fibonacci / price_variation_pct determinism (carve-out)
# ---------------------------------------------------------------------------

class TestTC03CarveOutIndicators:
    """TC-03: Fibonacci and price_variation_pct keep their existing implementations."""

    def test_fibonacci_deterministic(self, synthetic_ohlcv_candles):
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        r1 = ind.fibonacci_retracements(highs, lows, lookback=50)
        r2 = ind.fibonacci_retracements(highs, lows, lookback=50)
        for a, b in zip(r1, r2):
            assert a == b

    def test_price_variation_pct_deterministic(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        r1 = ind.price_variation_pct(closes)
        r2 = ind.price_variation_pct(closes)
        assert r1 == r2


# ---------------------------------------------------------------------------
# TC-04  Warmup → None contract
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
        macd_line, signal_line, histogram = ind.macd(closes)
        # MACD line needs slow EMA warmup (25 candles), signal needs 8 more
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
        """Ensure warmup values are strict None, not 0.0 or False."""
        closes = _closes(synthetic_ohlcv_candles)
        result = ind.sma(closes, period=20)
        warmup_values = result[:19]
        assert all(v is None for v in warmup_values)
        assert not any(v == 0.0 for v in warmup_values)
        assert not any(v is False for v in warmup_values)


# ---------------------------------------------------------------------------
# TC-05  Timestamp alignment
# ---------------------------------------------------------------------------

class TestTC05TimestampAlignment:
    """TC-05: indicator output indices align to candle timestamps."""

    def test_sma_aligned_to_candle_timestamps(self, synthetic_ohlcv_candles):
        candles = synthetic_ohlcv_candles
        closes = _closes(candles)
        result = ind.sma(closes, period=20)
        assert len(result) == len(candles)
        for i, (val, candle) in enumerate(zip(result, candles)):
            if val is not None:
                assert i >= 19, f"Non-None SMA at warmup index {i}"

    def test_macd_and_sma_same_length(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        sma_result = ind.sma(closes, period=20)
        macd_line, _, _ = ind.macd(closes)
        assert len(sma_result) == len(macd_line) == len(closes)


# ---------------------------------------------------------------------------
# TC-06  Invalid indicator validation
# ---------------------------------------------------------------------------

class TestTC06InvalidIndicatorValidation:
    """TC-06: existing validation errors are unchanged."""

    def test_unsupported_indicator_raises(self):
        """Unsupported indicator key should not silently succeed."""
        from fastapi.testclient import TestClient
        from sqlmodel import Session, SQLModel, create_engine
        from sqlalchemy.pool import StaticPool
        from app.main import app
        from app.core.database import get_session
        from app.core.security import hash_password
        from app.models.user import User, PlanTier, UserTier
        from uuid import uuid4

        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            user = User(
                id=uuid4(),
                email="parity-user@test.com",
                password_hash=hash_password("Test1234!"),
                plan_tier=PlanTier.FREE,
                user_tier=UserTier.STANDARD,
            )
            session.add(user)
            session.commit()

            def override():
                return session

            app.dependency_overrides[get_session] = override
            client = TestClient(app)

            r = client.post("/auth/login", json={"email": "parity-user@test.com", "password": "Test1234!"})
            token = r.json()["token"]

            r = client.get(
                "/market/chart-data",
                params={"asset": "BTC/USDT", "timeframe": "1d", "indicators": "unknown_indicator"},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert r.status_code == 400
            assert "unsupported" in r.json()["detail"].lower()

        app.dependency_overrides.clear()
        SQLModel.metadata.drop_all(engine)


# ---------------------------------------------------------------------------
# TC-07  Backtest determinism (call indicator functions twice)
# ---------------------------------------------------------------------------

class TestTC07BacktestDeterminism:
    """TC-07: repeated indicator calls with same inputs yield identical results."""

    def test_sma_deterministic(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        assert ind.sma(closes, 20) == ind.sma(closes, 20)

    def test_ema_deterministic(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        assert ind.ema(closes, 20) == ind.ema(closes, 20)

    def test_rsi_deterministic(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        assert ind.rsi(closes, 14) == ind.rsi(closes, 14)

    def test_macd_deterministic(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        assert ind.macd(closes) == ind.macd(closes)

    def test_bollinger_deterministic(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        assert ind.bollinger(closes) == ind.bollinger(closes)

    def test_stochastic_deterministic(self, synthetic_ohlcv_candles):
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        assert ind.stochastic(highs, lows, closes) == ind.stochastic(highs, lows, closes)

    def test_adx_deterministic(self, synthetic_ohlcv_candles):
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        assert ind.adx(highs, lows, closes) == ind.adx(highs, lows, closes)


# ---------------------------------------------------------------------------
# TC-08  Chart-data determinism
# ---------------------------------------------------------------------------

class TestTC08ChartDataDeterminism:
    """TC-08: chart-data series are deterministic for same inputs."""

    def test_ichimoku_deterministic(self, synthetic_ohlcv_candles):
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        assert ind.ichimoku(highs, lows, closes) == ind.ichimoku(highs, lows, closes)

    def test_obv_deterministic(self, synthetic_ohlcv_candles):
        closes = _closes(synthetic_ohlcv_candles)
        volumes = _volumes(synthetic_ohlcv_candles)
        assert ind.obv(closes, volumes) == ind.obv(closes, volumes)

    def test_atr_deterministic(self, synthetic_ohlcv_candles):
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        closes = _closes(synthetic_ohlcv_candles)
        assert ind.atr(highs, lows, closes) == ind.atr(highs, lows, closes)

    def test_fibonacci_deterministic(self, synthetic_ohlcv_candles):
        highs = _highs(synthetic_ohlcv_candles)
        lows = _lows(synthetic_ohlcv_candles)
        assert ind.fibonacci_retracements(highs, lows) == ind.fibonacci_retracements(highs, lows)
