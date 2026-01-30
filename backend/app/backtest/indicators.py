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


def stochastic(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    k_period: int = 14,
    d_period: int = 3,
    smooth: int = 3,
) -> tuple[list[Optional[float]], list[Optional[float]]]:
    """Stochastic Oscillator. Returns (%K, %D)."""
    n = len(closes)
    if n < k_period:
        return [None] * n, [None] * n

    # Calculate raw %K
    raw_k: list[Optional[float]] = []
    for i in range(n):
        if i < k_period - 1:
            raw_k.append(None)
        else:
            window_highs = highs[i - k_period + 1 : i + 1]
            window_lows = lows[i - k_period + 1 : i + 1]
            highest_high = max(window_highs)
            lowest_low = min(window_lows)

            if highest_high == lowest_low:
                raw_k.append(50.0)  # Avoid division by zero
            else:
                k_value = ((closes[i] - lowest_low) / (highest_high - lowest_low)) * 100
                raw_k.append(k_value)

    # Smooth %K using SMA
    smoothed_k = sma(raw_k, smooth)

    # Calculate %D (SMA of smoothed %K)
    d_line = sma(smoothed_k, d_period)

    return smoothed_k, d_line


def adx(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    period: int = 14,
) -> tuple[list[Optional[float]], list[Optional[float]], list[Optional[float]]]:
    """Average Directional Index. Returns (ADX, +DI, -DI)."""
    n = len(closes)
    if n < 2:
        return [None] * n, [None] * n, [None] * n

    # Calculate +DM, -DM, and TR
    plus_dm_values: list[float] = [0.0]  # First value
    minus_dm_values: list[float] = [0.0]
    true_ranges: list[float] = [highs[0] - lows[0]]

    for i in range(1, n):
        high_diff = highs[i] - highs[i - 1]
        low_diff = lows[i - 1] - lows[i]

        plus_dm = high_diff if high_diff > low_diff and high_diff > 0 else 0.0
        minus_dm = low_diff if low_diff > high_diff and low_diff > 0 else 0.0

        plus_dm_values.append(plus_dm)
        minus_dm_values.append(minus_dm)

        # True Range
        high_low = highs[i] - lows[i]
        high_close = abs(highs[i] - closes[i - 1])
        low_close = abs(lows[i] - closes[i - 1])
        true_ranges.append(max(high_low, high_close, low_close))

    # Smooth +DM, -DM, and TR using Wilder's method
    smoothed_plus_dm: list[Optional[float]] = []
    smoothed_minus_dm: list[Optional[float]] = []
    smoothed_tr: list[Optional[float]] = []

    for i in range(n):
        if i < period - 1:
            smoothed_plus_dm.append(None)
            smoothed_minus_dm.append(None)
            smoothed_tr.append(None)
        elif i == period - 1:
            smoothed_plus_dm.append(sum(plus_dm_values[:period]) / period)
            smoothed_minus_dm.append(sum(minus_dm_values[:period]) / period)
            smoothed_tr.append(sum(true_ranges[:period]) / period)
        else:
            prev_plus = smoothed_plus_dm[-1]
            prev_minus = smoothed_minus_dm[-1]
            prev_tr = smoothed_tr[-1]

            if prev_plus is not None and prev_minus is not None and prev_tr is not None:
                smoothed_plus_dm.append((prev_plus * (period - 1) + plus_dm_values[i]) / period)
                smoothed_minus_dm.append((prev_minus * (period - 1) + minus_dm_values[i]) / period)
                smoothed_tr.append((prev_tr * (period - 1) + true_ranges[i]) / period)
            else:
                smoothed_plus_dm.append(None)
                smoothed_minus_dm.append(None)
                smoothed_tr.append(None)

    # Calculate +DI and -DI
    plus_di: list[Optional[float]] = []
    minus_di: list[Optional[float]] = []

    for i in range(n):
        if smoothed_tr[i] is None or smoothed_tr[i] == 0:
            plus_di.append(None)
            minus_di.append(None)
        else:
            plus_di.append((smoothed_plus_dm[i] / smoothed_tr[i]) * 100)
            minus_di.append((smoothed_minus_dm[i] / smoothed_tr[i]) * 100)

    # Calculate DX
    dx_values: list[Optional[float]] = []
    for i in range(n):
        if plus_di[i] is None or minus_di[i] is None:
            dx_values.append(None)
        else:
            di_sum = plus_di[i] + minus_di[i]
            if di_sum == 0:
                dx_values.append(None)
            else:
                dx_values.append((abs(plus_di[i] - minus_di[i]) / di_sum) * 100)

    # Calculate ADX (smoothed DX)
    adx_line: list[Optional[float]] = []
    valid_dx = [v for v in dx_values if v is not None]

    for i in range(n):
        if dx_values[i] is None:
            adx_line.append(None)
        elif i < period * 2 - 2:  # Need period DI values + period DX values
            adx_line.append(None)
        elif len([v for v in dx_values[:i+1] if v is not None]) < period:
            adx_line.append(None)
        elif len(adx_line) == 0 or all(v is None for v in adx_line):
            # First ADX is simple average of first period DX values
            recent_dx = [v for v in dx_values[:i+1] if v is not None][-period:]
            if len(recent_dx) == period:
                adx_line.append(sum(recent_dx) / period)
            else:
                adx_line.append(None)
        else:
            # Smoothed ADX
            prev_adx = [v for v in adx_line if v is not None][-1] if any(v is not None for v in adx_line) else None
            if prev_adx is not None and dx_values[i] is not None:
                adx_line.append((prev_adx * (period - 1) + dx_values[i]) / period)
            else:
                adx_line.append(None)

    return adx_line, plus_di, minus_di


def ichimoku(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    conversion: int = 9,
    base: int = 26,
    span_b: int = 52,
    displacement: int = 26,
) -> tuple[list[Optional[float]], list[Optional[float]], list[Optional[float]], list[Optional[float]]]:
    """Ichimoku Cloud. Returns (conversion_line, base_line, span_a, span_b)."""
    n = len(closes)

    # Conversion Line (Tenkan-sen)
    conversion_line: list[Optional[float]] = []
    for i in range(n):
        if i < conversion - 1:
            conversion_line.append(None)
        else:
            window_highs = highs[i - conversion + 1 : i + 1]
            window_lows = lows[i - conversion + 1 : i + 1]
            conversion_line.append((max(window_highs) + min(window_lows)) / 2)

    # Base Line (Kijun-sen)
    base_line: list[Optional[float]] = []
    for i in range(n):
        if i < base - 1:
            base_line.append(None)
        else:
            window_highs = highs[i - base + 1 : i + 1]
            window_lows = lows[i - base + 1 : i + 1]
            base_line.append((max(window_highs) + min(window_lows)) / 2)

    # Leading Span A (Senkou Span A) - average of conversion and base
    span_a: list[Optional[float]] = []
    for i in range(n):
        if conversion_line[i] is None or base_line[i] is None:
            span_a.append(None)
        else:
            span_a.append((conversion_line[i] + base_line[i]) / 2)

    # Leading Span B (Senkou Span B)
    span_b_line: list[Optional[float]] = []
    for i in range(n):
        if i < span_b - 1:
            span_b_line.append(None)
        else:
            window_highs = highs[i - span_b + 1 : i + 1]
            window_lows = lows[i - span_b + 1 : i + 1]
            span_b_line.append((max(window_highs) + min(window_lows)) / 2)

    # Note: displacement is a visual parameter for plotting, not applied in calculation
    return conversion_line, base_line, span_a, span_b_line


def obv(
    closes: list[float],
    volumes: list[float],
) -> list[Optional[float]]:
    """On-Balance Volume. Returns cumulative volume."""
    n = len(closes)
    if n == 0 or len(volumes) == 0:
        return [None] * n

    result: list[Optional[float]] = [None]  # First value has no previous close

    if n == 1:
        return result

    # Start with first volume as baseline
    obv_value = 0.0

    for i in range(1, n):
        if closes[i] is None or closes[i - 1] is None or volumes[i] is None:
            result.append(None)
        elif closes[i] > closes[i - 1]:
            obv_value += volumes[i]
            result.append(obv_value)
        elif closes[i] < closes[i - 1]:
            obv_value -= volumes[i]
            result.append(obv_value)
        else:
            result.append(obv_value)

    return result


def fibonacci_retracements(
    highs: list[float],
    lows: list[float],
    lookback: int = 50,
) -> tuple[
    list[Optional[float]],  # 0.236
    list[Optional[float]],  # 0.382
    list[Optional[float]],  # 0.5
    list[Optional[float]],  # 0.618
    list[Optional[float]],  # 0.786
]:
    """Fibonacci Retracements. Returns 5 fixed retracement levels."""
    n = len(highs)

    level_236: list[Optional[float]] = []
    level_382: list[Optional[float]] = []
    level_5: list[Optional[float]] = []
    level_618: list[Optional[float]] = []
    level_786: list[Optional[float]] = []

    for i in range(n):
        if i < lookback - 1:
            level_236.append(None)
            level_382.append(None)
            level_5.append(None)
            level_618.append(None)
            level_786.append(None)
        else:
            window_highs = highs[i - lookback + 1 : i + 1]
            window_lows = lows[i - lookback + 1 : i + 1]

            highest = max(window_highs)
            lowest = min(window_lows)
            range_val = highest - lowest

            if range_val == 0:
                # No range, all levels are the same
                level_236.append(lowest)
                level_382.append(lowest)
                level_5.append(lowest)
                level_618.append(lowest)
                level_786.append(lowest)
            else:
                # Retracement levels from high to low
                level_236.append(highest - range_val * 0.236)
                level_382.append(highest - range_val * 0.382)
                level_5.append(highest - range_val * 0.5)
                level_618.append(highest - range_val * 0.618)
                level_786.append(highest - range_val * 0.786)

    return level_236, level_382, level_5, level_618, level_786


def price_variation_pct(closes: list[float]) -> list[Optional[float]]:
    """Price variation % from previous close. Returns signed percentage."""
    n = len(closes)
    if n == 0:
        return []

    result: list[Optional[float]] = [None]  # First value has no previous

    for i in range(1, n):
        if closes[i] is None or closes[i - 1] is None:
            result.append(None)
        elif closes[i - 1] == 0:
            result.append(None)  # Avoid division by zero
        else:
            pct_change = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100
            result.append(pct_change)

    return result
