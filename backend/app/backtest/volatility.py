"""Volatility calculations for market data."""
import math
from typing import Optional


def calculate_log_returns(closes: list[float]) -> list[float]:
    """Calculate log returns from close prices.

    Returns: ln(close_t / close_{t-1}) for each period.
    First value is 0.0 (no prior period).
    """
    if len(closes) < 2:
        return [0.0] * len(closes)

    returns = [0.0]  # First period has no prior
    for i in range(1, len(closes)):
        if closes[i - 1] > 0:
            returns.append(math.log(closes[i] / closes[i - 1]))
        else:
            returns.append(0.0)
    return returns


def calculate_stddev_volatility(closes: list[float], window: int = 30) -> Optional[float]:
    """Calculate standard deviation of log returns over window.

    Args:
        closes: List of close prices (most recent last)
        window: Number of periods for rolling window (default 30)

    Returns:
        Standard deviation of log returns, or None if insufficient data
    """
    if len(closes) < window:
        return None

    # Use only the most recent `window` candles
    recent_closes = closes[-window:]
    log_returns = calculate_log_returns(recent_closes)

    # Skip first value (it's 0.0)
    returns = log_returns[1:]

    if len(returns) < 2:
        return None

    mean = sum(returns) / len(returns)
    variance = sum((r - mean) ** 2 for r in returns) / len(returns)
    return math.sqrt(variance)


def calculate_atr_pct(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    current_price: float,
    window: int = 30
) -> Optional[float]:
    """Calculate ATR as percentage of current price.

    Args:
        highs: List of high prices
        lows: List of low prices
        closes: List of close prices
        current_price: Current close price for percentage calculation
        window: Number of periods for ATR (default 30)

    Returns:
        ATR / current_price * 100, or None if insufficient data
    """
    from app.backtest.indicators import atr

    if len(closes) < window or current_price <= 0:
        return None

    # Calculate ATR using existing utility
    atr_values = atr(highs, lows, closes, period=window)

    # Get the last ATR value (most recent)
    current_atr = atr_values[-1] if atr_values else None

    if current_atr is None:
        return None

    return (current_atr / current_price) * 100


def calculate_volatility_percentile(
    closes: list[float],
    window: int = 30,
    history_days: int = 365
) -> Optional[float]:
    """Calculate percentile rank of current volatility vs 1-year history.

    Args:
        closes: List of close prices (most recent last)
        window: Window for volatility calculation (default 30)
        history_days: Days of history to compare against (default 365)

    Returns:
        Percentile rank (0-100), or None if insufficient data
    """
    # Need at least history_days for comparison
    if len(closes) < history_days:
        return None

    # Calculate current volatility (last 30 days)
    current_vol = calculate_stddev_volatility(closes[-window:], window)
    if current_vol is None:
        return None

    # Calculate rolling volatilities over the past year
    historical_vols = []
    # Start from window size and go through the history
    for i in range(len(closes) - history_days, len(closes) - window + 1):
        if i < 0:
            continue
        subset = closes[i:i + window]
        if len(subset) >= window:
            vol = calculate_stddev_volatility(subset, window)
            if vol is not None:
                historical_vols.append(vol)

    if not historical_vols:
        return None

    # Calculate percentile: how many historical values are below current?
    below_count = sum(1 for v in historical_vols if v <= current_vol)
    percentile = (below_count / len(historical_vols)) * 100

    return round(percentile, 1)
