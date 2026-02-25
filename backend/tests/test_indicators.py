"""Tests for technical indicator calculations."""
import math
from typing import Optional

import pytest

from app.backtest.indicators import (
    sma,
    ema,
    rsi,
    macd,
    bollinger,
    atr,
    stochastic,
    adx,
    ichimoku,
    obv,
    fibonacci_retracements,
    price_variation_pct,
)


class TestSMA:
    """Tests for Simple Moving Average."""

    def test_sma_basic_calculation(self):
        """SMA should calculate correct average."""
        closes = [10.0, 20.0, 30.0, 40.0, 50.0]
        result = sma(closes, period=3)

        # First 2 values should be None (warmup)
        assert result[0] is None
        assert result[1] is None
        # SMA(3) at index 2: (10+20+30)/3 = 20
        assert result[2] == 20.0
        # SMA(3) at index 3: (20+30+40)/3 = 30
        assert result[3] == 30.0
        # SMA(3) at index 4: (30+40+50)/3 = 40
        assert result[4] == 40.0

    def test_sma_warmup_period(self):
        """SMA should return None for warmup period."""
        closes = [100.0] * 10
        result = sma(closes, period=5)

        # First 4 values should be None
        for i in range(4):
            assert result[i] is None
        # 5th value onwards should be computed
        for i in range(4, 10):
            assert result[i] == 100.0

    def test_sma_single_value(self):
        """SMA with period=1 should return the values themselves."""
        closes = [10.0, 20.0, 30.0]
        result = sma(closes, period=1)

        assert result == [10.0, 20.0, 30.0]

    def test_sma_empty_list(self):
        """SMA of empty list should return empty list."""
        result = sma([], period=3)
        assert result == []

    def test_sma_handles_none_in_window(self):
        """SMA should return None if window contains None."""
        closes = [10.0, None, 30.0, 40.0, 50.0]
        result = sma(closes, period=3)

        # Index 2 window has None at index 1
        assert result[2] is None
        # Index 3 window has None at index 1
        assert result[3] is None
        # Index 4 window is [30, 40, 50] - no None
        assert result[4] == 40.0


class TestEMA:
    """Tests for Exponential Moving Average."""

    def test_ema_first_value_equals_sma(self):
        """First EMA value should equal SMA of first period values."""
        closes = [10.0, 20.0, 30.0, 40.0, 50.0]
        result = ema(closes, period=3)

        # First EMA at index 2 should be SMA: (10+20+30)/3 = 20
        assert result[2] == 20.0

    def test_ema_warmup_period(self):
        """EMA should return None for warmup period."""
        closes = [100.0] * 10
        result = ema(closes, period=5)

        # First 4 values should be None
        for i in range(4):
            assert result[i] is None

    def test_ema_reacts_to_price_changes(self):
        """EMA should react to price changes with exponential weight."""
        closes = [100.0, 100.0, 100.0, 150.0, 150.0]
        result = ema(closes, period=3)

        # Multiplier = 2/(3+1) = 0.5
        # EMA[2] = 100 (SMA)
        # EMA[3] = (150-100)*0.5 + 100 = 125
        # EMA[4] = (150-125)*0.5 + 125 = 137.5
        assert result[2] == 100.0
        assert result[3] == 125.0
        assert result[4] == 137.5

    def test_ema_empty_list(self):
        """EMA of empty list should return empty list."""
        result = ema([], period=3)
        assert result == []


class TestRSI:
    """Tests for Relative Strength Index."""

    def test_rsi_all_gains_equals_100(self):
        """RSI should be 100 when all changes are positive."""
        # Start at 100, increase by 1 each day
        closes = [100.0 + i for i in range(20)]
        result = rsi(closes, period=14)

        # After warmup, RSI should be 100 (all gains, no losses)
        assert result[14] == 100.0

    def test_rsi_all_losses_equals_0(self):
        """RSI should be 0 when all changes are negative."""
        # Start at 100, decrease by 1 each day
        closes = [100.0 - i for i in range(20)]
        result = rsi(closes, period=14)

        # After warmup, RSI should be 0 (all losses, no gains)
        assert result[14] == 0.0

    def test_rsi_warmup_period(self):
        """RSI should return None for warmup period."""
        closes = [100.0] * 20
        result = rsi(closes, period=14)

        # First value is always None (no prior change)
        assert result[0] is None
        # Values 1-13 are warmup
        for i in range(1, 14):
            assert result[i] is None

    def test_rsi_range_0_to_100(self):
        """RSI should always be between 0 and 100."""
        # Mix of gains and losses
        closes = [100, 105, 103, 108, 106, 110, 108, 112, 110, 115, 113, 118, 116, 120, 118]
        result = rsi(closes, period=14)

        for value in result:
            if value is not None:
                assert 0 <= value <= 100

    def test_rsi_short_list(self):
        """RSI of list shorter than 2 should return all None."""
        result = rsi([100.0], period=14)
        assert result == [None]


class TestMACD:
    """Tests for MACD indicator."""

    def test_macd_returns_three_lists(self):
        """MACD should return macd_line, signal_line, histogram."""
        closes = [100.0 + i for i in range(50)]
        macd_line, signal_line, histogram = macd(closes, fast=12, slow=26, signal=9)

        assert len(macd_line) == 50
        assert len(signal_line) == 50
        assert len(histogram) == 50

    def test_macd_warmup_period(self):
        """MACD line should have None values during EMA warmup."""
        closes = [100.0] * 50
        macd_line, signal_line, histogram = macd(closes, fast=12, slow=26, signal=9)

        # Slow EMA needs 26-1 = 25 warmup periods
        for i in range(25):
            assert macd_line[i] is None

    def test_macd_line_is_fast_minus_slow(self):
        """MACD line should equal fast EMA minus slow EMA."""
        closes = [100.0 + i * 2 for i in range(50)]  # Clear uptrend
        macd_line, _, _ = macd(closes, fast=12, slow=26, signal=9)

        fast_ema_values = ema(closes, 12)
        slow_ema_values = ema(closes, 26)

        # Check a point where both EMAs are computed
        idx = 30
        expected = fast_ema_values[idx] - slow_ema_values[idx]
        assert abs(macd_line[idx] - expected) < 0.0001

    def test_macd_histogram_is_macd_minus_signal(self):
        """Histogram should equal MACD line minus signal line."""
        closes = [100.0 + i for i in range(50)]
        macd_line, signal_line, histogram = macd(closes, fast=12, slow=26, signal=9)

        for m, s, h in zip(macd_line, signal_line, histogram):
            if m is not None and s is not None and h is not None:
                assert abs(h - (m - s)) < 0.0001


class TestBollinger:
    """Tests for Bollinger Bands."""

    def test_bollinger_returns_three_lists(self):
        """Bollinger should return upper, middle, lower bands."""
        closes = [100.0] * 30
        upper, middle, lower = bollinger(closes, period=20, std_dev=2.0)

        assert len(upper) == 30
        assert len(middle) == 30
        assert len(lower) == 30

    def test_bollinger_middle_equals_sma(self):
        """Middle band should equal SMA."""
        closes = [100.0 + i for i in range(30)]
        upper, middle, lower = bollinger(closes, period=20)
        sma_values = sma(closes, 20)

        for m, s in zip(middle, sma_values):
            if m is not None and s is not None:
                assert m == s

    def test_bollinger_constant_price_bands_converge(self):
        """With constant price, bands should converge to middle (std=0)."""
        closes = [100.0] * 30
        upper, middle, lower = bollinger(closes, period=20, std_dev=2.0)

        # After warmup, with constant prices, std dev is 0
        # So upper = middle = lower
        for i in range(19, 30):
            assert upper[i] == middle[i] == lower[i] == 100.0

    def test_bollinger_upper_greater_than_lower(self):
        """Upper band should always be >= lower band."""
        closes = [100 + (i % 10) for i in range(50)]  # Some variation
        upper, middle, lower = bollinger(closes, period=20)

        for u, l in zip(upper, lower):
            if u is not None and l is not None:
                assert u >= l


class TestATR:
    """Tests for Average True Range."""

    def test_atr_basic_calculation(self):
        """ATR should calculate correct true range average."""
        highs = [110.0, 112.0, 115.0, 114.0, 116.0]
        lows = [100.0, 105.0, 108.0, 106.0, 110.0]
        closes = [105.0, 110.0, 112.0, 108.0, 114.0]

        result = atr(highs, lows, closes, period=3)

        # First 2 values should be None (warmup)
        assert result[0] is None
        assert result[1] is None
        # 3rd value is first ATR

    def test_atr_warmup_period(self):
        """ATR should return None for warmup period."""
        highs = [110.0] * 20
        lows = [100.0] * 20
        closes = [105.0] * 20

        result = atr(highs, lows, closes, period=14)

        for i in range(13):
            assert result[i] is None

    def test_atr_first_value_is_simple_average(self):
        """First ATR value should be simple average of true ranges."""
        highs = [110.0, 112.0, 115.0]
        lows = [100.0, 105.0, 108.0]
        closes = [105.0, 110.0, 112.0]

        result = atr(highs, lows, closes, period=3)

        # TR[0] = 110 - 100 = 10
        # TR[1] = max(112-105, |112-105|, |105-105|) = max(7, 7, 0) = 7
        # TR[2] = max(115-108, |115-110|, |108-110|) = max(7, 5, 2) = 7
        # First ATR = (10+7+7)/3 = 8
        assert result[2] == 8.0

    def test_atr_short_list(self):
        """ATR of list shorter than 2 should return all None."""
        result = atr([110.0], [100.0], [105.0], period=14)
        assert result == [None]


class TestIndicatorEdgeCases:
    """Edge case tests for all indicators."""

    def test_all_indicators_handle_empty_lists(self):
        """All indicators should handle empty input gracefully."""
        assert sma([], 5) == []
        assert ema([], 5) == []
        assert rsi([], 14) == []

        macd_line, signal_line, histogram = macd([], 12, 26, 9)
        assert macd_line == []

        upper, middle, lower = bollinger([], 20)
        assert upper == []

        assert atr([], [], [], 14) == []

    def test_indicators_period_larger_than_data(self):
        """Indicators with period > data length should return all None."""
        closes = [100.0, 101.0, 102.0]

        sma_result = sma(closes, period=10)
        assert all(v is None for v in sma_result)

        ema_result = ema(closes, period=10)
        assert all(v is None for v in ema_result)


class TestStochastic:
    """Tests for Stochastic Oscillator."""

    def test_stochastic_returns_two_lists(self):
        """Stochastic should return %K and %D."""
        highs = [110.0] * 50
        lows = [100.0] * 50
        closes = [105.0] * 50
        k_line, d_line = stochastic(highs, lows, closes, k_period=14, d_period=3, smooth=3)

        assert len(k_line) == 50
        assert len(d_line) == 50

    def test_stochastic_warmup_period(self):
        """Stochastic should have None values during warmup."""
        highs = [110.0] * 50
        lows = [100.0] * 50
        closes = [105.0] * 50
        k_line, d_line = stochastic(highs, lows, closes, k_period=14, d_period=3, smooth=3)

        # %K warmup: k_period - 1 = 13, then smooth - 1 = 2, total = 15
        for i in range(15):
            assert k_line[i] is None
        # %D has additional d_period - 1 warmup = 17
        for i in range(17):
            assert d_line[i] is None

    def test_stochastic_range_0_to_100(self):
        """Stochastic values should be between 0 and 100."""
        highs = [110 + i for i in range(50)]
        lows = [100 + i for i in range(50)]
        closes = [105 + i for i in range(50)]
        k_line, d_line = stochastic(highs, lows, closes)

        for k in k_line:
            if k is not None:
                assert 0 <= k <= 100
        for d in d_line:
            if d is not None:
                assert 0 <= d <= 100

    def test_stochastic_flat_price(self):
        """Stochastic should handle flat prices (no range)."""
        highs = [100.0] * 50
        lows = [100.0] * 50
        closes = [100.0] * 50
        k_line, d_line = stochastic(highs, lows, closes)

        # When highest == lowest, should return 50
        for k in k_line:
            if k is not None:
                assert k == 50.0


class TestADX:
    """Tests for Average Directional Index."""

    def test_adx_returns_three_lists(self):
        """ADX should return ADX, +DI, -DI."""
        highs = [110.0] * 50
        lows = [100.0] * 50
        closes = [105.0] * 50
        adx_line, plus_di, minus_di = adx(highs, lows, closes, period=14)

        assert len(adx_line) == 50
        assert len(plus_di) == 50
        assert len(minus_di) == 50

    def test_adx_warmup_period(self):
        """ADX should have None values during warmup."""
        highs = [110.0] * 50
        lows = [100.0] * 50
        closes = [105.0] * 50
        adx_line, plus_di, minus_di = adx(highs, lows, closes, period=14)

        # DI warmup: period - 1 = 13
        for i in range(13):
            assert plus_di[i] is None
            assert minus_di[i] is None
        # ADX has longer warmup (needs period DI + period DX)
        for i in range(27):
            assert adx_line[i] is None

    def test_adx_uptrend(self, uptrend_candles):
        """ADX should show directional movement in uptrend."""
        highs = [c.high for c in uptrend_candles]
        lows = [c.low for c in uptrend_candles]
        closes = [c.close for c in uptrend_candles]
        adx_line, plus_di, minus_di = adx(highs, lows, closes, period=14)

        # In uptrend, +DI should generally be higher than -DI
        valid_indices = [i for i in range(len(plus_di)) if plus_di[i] is not None and minus_di[i] is not None]
        if valid_indices:
            # Check at least one point where +DI > -DI
            assert any(plus_di[i] > minus_di[i] for i in valid_indices)


class TestIchimoku:
    """Tests for Ichimoku Cloud."""

    def test_ichimoku_returns_four_lists(self):
        """Ichimoku should return 4 lines."""
        highs = [110.0] * 100
        lows = [100.0] * 100
        closes = [105.0] * 100
        conv, base, span_a, span_b = ichimoku(highs, lows, closes)

        assert len(conv) == 100
        assert len(base) == 100
        assert len(span_a) == 100
        assert len(span_b) == 100

    def test_ichimoku_warmup_periods(self):
        """Ichimoku lines should have appropriate warmup."""
        highs = [110.0] * 100
        lows = [100.0] * 100
        closes = [105.0] * 100
        conv, base, span_a, span_b = ichimoku(highs, lows, closes)

        # Conversion warmup: conversion - 1 = 8
        for i in range(8):
            assert conv[i] is None
        # Base warmup: base - 1 = 25
        for i in range(25):
            assert base[i] is None
        # Span B warmup: span_b - 1 = 51
        for i in range(51):
            assert span_b[i] is None

    def test_ichimoku_flat_price(self):
        """Ichimoku should handle flat prices."""
        highs = [100.0] * 100
        lows = [100.0] * 100
        closes = [100.0] * 100
        conv, base, span_a, span_b = ichimoku(highs, lows, closes)

        # All values should be 100 after warmup
        for i in range(52, 100):
            assert conv[i] == 100.0
            assert base[i] == 100.0
            assert span_a[i] == 100.0
            assert span_b[i] == 100.0


class TestOBV:
    """Tests for On-Balance Volume."""

    def test_obv_basic_calculation(self):
        """OBV should accumulate volume based on price direction."""
        closes = [100.0, 105.0, 103.0, 108.0, 108.0]
        volumes = [1000.0, 1500.0, 1200.0, 1800.0, 1000.0]
        result = obv(closes, volumes)

        assert len(result) == 5
        assert result[0] is None  # No previous close
        # Index 1: price up, add volume = +1500
        assert result[1] == 1500.0
        # Index 2: price down, subtract volume = 1500 - 1200 = 300
        assert result[2] == 300.0
        # Index 3: price up, add volume = 300 + 1800 = 2100
        assert result[3] == 2100.0
        # Index 4: price same, no change = 2100
        assert result[4] == 2100.0

    def test_obv_all_gains(self):
        """OBV should increase when all prices rise."""
        closes = [100.0 + i for i in range(10)]
        volumes = [1000.0] * 10
        result = obv(closes, volumes)

        # Each step should add 1000
        for i in range(1, len(result)):
            if result[i] is not None and result[i - 1] is not None:
                assert result[i] > result[i - 1]

    def test_obv_handles_none(self):
        """OBV should handle None values."""
        closes = [100.0, None, 105.0]
        volumes = [1000.0, 1000.0, 1000.0]
        result = obv(closes, volumes)

        assert result[0] is None
        assert result[1] is None
        assert result[2] is None  # Can't calculate without previous valid close


class TestFibonacci:
    """Tests for Fibonacci Retracements."""

    def test_fibonacci_returns_five_levels(self):
        """Fibonacci should return 5 retracement levels."""
        highs = [110.0] * 100
        lows = [100.0] * 100
        level_236, level_382, level_5, level_618, level_786 = fibonacci_retracements(
            highs, lows, lookback=50
        )

        assert len(level_236) == 100
        assert len(level_382) == 100
        assert len(level_5) == 100
        assert len(level_618) == 100
        assert len(level_786) == 100

    def test_fibonacci_warmup_period(self):
        """Fibonacci should have None during warmup."""
        highs = [110.0] * 100
        lows = [100.0] * 100
        level_236, _, _, _, _ = fibonacci_retracements(highs, lows, lookback=50)

        # Warmup: lookback - 1 = 49
        for i in range(49):
            assert level_236[i] is None

    def test_fibonacci_levels_ordering(self):
        """Fibonacci levels should be ordered correctly."""
        highs = [120.0] * 100
        lows = [100.0] * 100
        level_236, level_382, level_5, level_618, level_786 = fibonacci_retracements(
            highs, lows, lookback=50
        )

        # For a range of 100-120 (20 units):
        # Levels are retracements from high: 0.786 lowest, 0.236 highest
        for i in range(50, 100):
            if all(
                x is not None
                for x in [level_236[i], level_382[i], level_5[i], level_618[i], level_786[i]]
            ):
                assert level_786[i] < level_618[i] < level_5[i] < level_382[i] < level_236[i]

    def test_fibonacci_known_values(self):
        """Fibonacci should calculate correct retracement values."""
        highs = [120.0] * 100
        lows = [100.0] * 100
        level_236, level_382, level_5, level_618, level_786 = fibonacci_retracements(
            highs, lows, lookback=50
        )

        # Range = 120 - 100 = 20
        # Level 0.5 = 120 - 20 * 0.5 = 110
        assert abs(level_5[50] - 110.0) < 0.01

    def test_fibonacci_no_range(self):
        """Fibonacci should handle flat prices (no range)."""
        highs = [100.0] * 100
        lows = [100.0] * 100
        level_236, level_382, level_5, level_618, level_786 = fibonacci_retracements(
            highs, lows, lookback=50
        )

        # All levels should equal the price
        for i in range(50, 100):
            assert level_236[i] == 100.0
            assert level_382[i] == 100.0
            assert level_5[i] == 100.0
            assert level_618[i] == 100.0
            assert level_786[i] == 100.0


class TestPriceVariationPct:
    """Tests for Price Variation %."""

    def test_price_variation_basic_calculation(self):
        """Price variation should calculate correct percentage."""
        closes = [100.0, 105.0, 100.0, 110.0]
        result = price_variation_pct(closes)

        assert result[0] is None  # No previous
        assert abs(result[1] - 5.0) < 0.01  # (105-100)/100 * 100 = 5%
        assert abs(result[2] - (-4.761904761904762)) < 0.01  # (100-105)/105 * 100
        assert abs(result[3] - 10.0) < 0.01  # (110-100)/100 * 100 = 10%

    def test_price_variation_negative_values(self):
        """Price variation should return negative for price drops."""
        closes = [100.0, 90.0]
        result = price_variation_pct(closes)

        assert result[1] == -10.0  # (90-100)/100 * 100 = -10%

    def test_price_variation_handles_zero(self):
        """Price variation should handle zero previous close."""
        closes = [0.0, 100.0]
        result = price_variation_pct(closes)

        assert result[0] is None
        assert result[1] is None  # Division by zero

    def test_price_variation_handles_none(self):
        """Price variation should handle None values."""
        closes = [100.0, None, 105.0]
        result = price_variation_pct(closes)

        assert result[0] is None
        assert result[1] is None
        assert result[2] is None  # Previous was None

    def test_price_variation_no_change(self):
        """Price variation should return 0% for no change."""
        closes = [100.0, 100.0]
        result = price_variation_pct(closes)

        assert result[1] == 0.0
