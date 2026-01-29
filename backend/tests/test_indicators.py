"""Tests for technical indicator calculations."""
import math
from typing import Optional

import pytest

from app.backtest.indicators import sma, ema, rsi, macd, bollinger, atr


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
