"""Technical indicator calculations for backtesting.

All functions operate on lists of floats and return lists of the same length.
Returns None for periods where indicator cannot be computed (warm-up period).
"""
from typing import Optional

import pandas_ta_classic as ta

from app.backtest._ta_adapter import from_series, to_series


def sma(closes: list[float], period: int) -> list[Optional[float]]:
    """Simple Moving Average."""
    n = len(closes)
    return from_series(ta.sma(to_series(closes), length=period), n)


def ema(closes: list[float], period: int) -> list[Optional[float]]:
    """Exponential Moving Average."""
    n = len(closes)
    return from_series(ta.ema(to_series(closes), length=period), n)


def rsi(closes: list[float], period: int) -> list[Optional[float]]:
    """Relative Strength Index (0-100)."""
    n = len(closes)
    return from_series(ta.rsi(to_series(closes), length=period), n)


def macd(
    closes: list[float],
    fast: int = 12,
    slow: int = 26,
    signal: int = 9,
) -> tuple[list[Optional[float]], list[Optional[float]], list[Optional[float]]]:
    """MACD indicator. Returns (macd_line, signal_line, histogram)."""
    n = len(closes)
    df = ta.macd(to_series(closes), fast=fast, slow=slow, signal=signal)
    if df is None:
        return [None] * n, [None] * n, [None] * n
    normalized_fast, normalized_slow = min(fast, slow), max(fast, slow)
    macd_col = f"MACD_{normalized_fast}_{normalized_slow}_{signal}"
    signal_col = f"MACDs_{normalized_fast}_{normalized_slow}_{signal}"
    hist_col = f"MACDh_{normalized_fast}_{normalized_slow}_{signal}"
    return from_series(df[macd_col], n), from_series(df[signal_col], n), from_series(df[hist_col], n)


def bollinger(
    closes: list[float],
    period: int = 20,
    std_dev: float = 2.0,
) -> tuple[list[Optional[float]], list[Optional[float]], list[Optional[float]]]:
    """Bollinger Bands. Returns (upper, middle, lower)."""
    n = len(closes)
    df = ta.bbands(to_series(closes), length=period, std=std_dev)
    if df is None:
        return [None] * n, [None] * n, [None] * n
    upper_col = next(c for c in df.columns if c.startswith(f"BBU_{period}_"))
    middle_col = next(c for c in df.columns if c.startswith(f"BBM_{period}_"))
    lower_col = next(c for c in df.columns if c.startswith(f"BBL_{period}_"))
    return from_series(df[upper_col], n), from_series(df[middle_col], n), from_series(df[lower_col], n)


def atr(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    period: int = 14,
) -> list[Optional[float]]:
    """Average True Range."""
    n = len(closes)
    return from_series(ta.atr(to_series(highs), to_series(lows), to_series(closes), length=period), n)


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
    df = ta.stoch(to_series(highs), to_series(lows), to_series(closes), k=k_period, d=d_period, smooth_k=smooth)
    if df is None:
        return [None] * n, [None] * n
    k_col = f"STOCHk_{k_period}_{d_period}_{smooth}"
    d_col = f"STOCHd_{k_period}_{d_period}_{smooth}"
    return from_series(df[k_col], n), from_series(df[d_col], n)


def adx(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    period: int = 14,
) -> tuple[list[Optional[float]], list[Optional[float]], list[Optional[float]]]:
    """Average Directional Index. Returns (ADX, +DI, -DI)."""
    n = len(closes)
    df = ta.adx(to_series(highs), to_series(lows), to_series(closes), length=period)
    if df is None:
        return [None] * n, [None] * n, [None] * n
    adx_col = f"ADX_{period}"
    dmp_col = f"DMP_{period}"
    dmn_col = f"DMN_{period}"
    return from_series(df[adx_col], n), from_series(df[dmp_col], n), from_series(df[dmn_col], n)


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
    result = ta.ichimoku(to_series(highs), to_series(lows), to_series(closes), tenkan=conversion, kijun=base, senkou=span_b)
    if result is None or result[0] is None:
        return [None] * n, [None] * n, [None] * n, [None] * n
    df = result[0]
    conv_col = f"ITS_{conversion}"
    base_col = f"IKS_{base}"
    span_a_col = f"ISA_{conversion}"
    span_b_col = f"ISB_{base}"
    return (
        from_series(df[conv_col], n),
        from_series(df[base_col], n),
        from_series(df[span_a_col], n),
        from_series(df[span_b_col], n),
    )


def obv(
    closes: list[float],
    volumes: list[float],
) -> list[Optional[float]]:
    """On-Balance Volume. Returns cumulative volume."""
    n = len(closes)
    return from_series(ta.obv(to_series(closes), to_series(volumes)), n)


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
                level_236.append(lowest)
                level_382.append(lowest)
                level_5.append(lowest)
                level_618.append(lowest)
                level_786.append(lowest)
            else:
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
