"""Technical indicator calculations for backtesting.

All functions operate on lists of floats and return lists of the same length.
Returns None for periods where indicator cannot be computed (warm-up period).
"""
from typing import Optional
import math


def sma(closes: list[float], period: int) -> list[Optional[float]]:
    """Simple Moving Average."""
    result: list[Optional[float]] = []
    for i in range(len(closes)):
        if i < period - 1:
            result.append(None)
        else:
            window = closes[i - period + 1 : i + 1]
            # Handle None values in window
            if any(v is None for v in window):
                result.append(None)
            else:
                result.append(sum(window) / period)
    return result


def ema(closes: list[float], period: int) -> list[Optional[float]]:
    """Exponential Moving Average."""
    result: list[Optional[float]] = []
    multiplier = 2 / (period + 1)
    ema_value: Optional[float] = None

    for i, close in enumerate(closes):
        if i < period - 1:
            result.append(None)
        elif close is None:
            # If current value is None, we can't compute EMA
            result.append(None)
        elif ema_value is None:
            # First EMA: need SMA of first `period` valid values
            window = closes[i - period + 1 : i + 1]
            if any(v is None for v in window):
                result.append(None)
            else:
                ema_value = sum(window) / period
                result.append(ema_value)
        else:
            ema_value = (close - ema_value) * multiplier + ema_value
            result.append(ema_value)

    return result


def rsi(closes: list[float], period: int) -> list[Optional[float]]:
    """Relative Strength Index (0-100)."""
    if len(closes) < 2:
        return [None] * len(closes)

    result: list[Optional[float]] = [None]  # First value has no change

    gains: list[Optional[float]] = []
    losses: list[Optional[float]] = []

    for i in range(1, len(closes)):
        # Handle None values in input
        if closes[i] is None or closes[i - 1] is None:
            gains.append(None)
            losses.append(None)
            result.append(None)
            continue

        change = closes[i] - closes[i - 1]
        gains.append(max(0, change))
        losses.append(max(0, -change))

        if i < period:
            result.append(None)
        else:
            # Check if we have enough valid values
            window_gains = gains[i - period : i]
            window_losses = losses[i - period : i]
            if any(v is None for v in window_gains) or any(v is None for v in window_losses):
                result.append(None)
                continue

            avg_gain = sum(window_gains) / period
            avg_loss = sum(window_losses) / period
            if avg_loss == 0:
                result.append(100.0)
            else:
                rs = avg_gain / avg_loss
                result.append(100 - (100 / (1 + rs)))

    return result


def macd(
    closes: list[float],
    fast: int = 12,
    slow: int = 26,
    signal: int = 9,
) -> tuple[list[Optional[float]], list[Optional[float]], list[Optional[float]]]:
    """MACD indicator. Returns (macd_line, signal_line, histogram)."""
    fast_ema = ema(closes, fast)
    slow_ema = ema(closes, slow)

    # MACD line = Fast EMA - Slow EMA
    macd_line: list[Optional[float]] = []
    for f, s in zip(fast_ema, slow_ema):
        if f is None or s is None:
            macd_line.append(None)
        else:
            macd_line.append(f - s)

    # Signal line = EMA of MACD line
    # Filter out None values for EMA calculation
    macd_values = [v for v in macd_line if v is not None]
    signal_ema = ema(macd_values, signal) if macd_values else []

    # Map signal EMA back to full length
    signal_line: list[Optional[float]] = []
    signal_idx = 0
    for m in macd_line:
        if m is None:
            signal_line.append(None)
        else:
            if signal_idx < len(signal_ema):
                signal_line.append(signal_ema[signal_idx])
                signal_idx += 1
            else:
                signal_line.append(None)

    # Histogram = MACD - Signal
    histogram: list[Optional[float]] = []
    for m, s in zip(macd_line, signal_line):
        if m is None or s is None:
            histogram.append(None)
        else:
            histogram.append(m - s)

    return macd_line, signal_line, histogram


def bollinger(
    closes: list[float],
    period: int = 20,
    std_dev: float = 2.0,
) -> tuple[list[Optional[float]], list[Optional[float]], list[Optional[float]]]:
    """Bollinger Bands. Returns (upper, middle, lower)."""
    middle = sma(closes, period)

    upper: list[Optional[float]] = []
    lower: list[Optional[float]] = []

    for i in range(len(closes)):
        if middle[i] is None:
            upper.append(None)
            lower.append(None)
        else:
            window = closes[i - period + 1 : i + 1]
            # Handle None values in window (extra safety)
            if any(v is None for v in window):
                upper.append(None)
                lower.append(None)
            else:
                mean = middle[i]
                variance = sum((x - mean) ** 2 for x in window) / period
                std = math.sqrt(variance)
                upper.append(mean + std_dev * std)
                lower.append(mean - std_dev * std)

    return upper, middle, lower


def atr(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    period: int = 14,
) -> list[Optional[float]]:
    """Average True Range."""
    if len(closes) < 2:
        return [None] * len(closes)

    true_ranges: list[float] = [highs[0] - lows[0]]  # First TR is just high - low

    for i in range(1, len(closes)):
        high_low = highs[i] - lows[i]
        high_close = abs(highs[i] - closes[i - 1])
        low_close = abs(lows[i] - closes[i - 1])
        true_ranges.append(max(high_low, high_close, low_close))

    result: list[Optional[float]] = []
    for i in range(len(closes)):
        if i < period - 1:
            result.append(None)
        elif i == period - 1:
            # First ATR is simple average
            result.append(sum(true_ranges[:period]) / period)
        else:
            # Smoothed ATR
            prev_atr = result[-1]
            if prev_atr is not None:
                result.append((prev_atr * (period - 1) + true_ranges[i]) / period)
            else:
                result.append(None)

    return result
