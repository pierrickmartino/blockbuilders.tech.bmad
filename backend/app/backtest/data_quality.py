"""Data quality validation service."""
from datetime import datetime, timedelta, timezone
import logging

from sqlmodel import Session, select

from app.backtest.candles import TIMEFRAME_SECONDS
from app.core.config import settings
from app.models.candle import Candle
from app.models.data_quality_metric import DataQualityMetric

logger = logging.getLogger(__name__)

def compute_daily_metrics(
    asset: str,
    timeframe: str,
    date: datetime,
    session: Session,
    outlier_threshold: float | None = None,
) -> dict:
    """
    Compute quality metrics for one day.

    Args:
        asset: Asset pair (e.g., "BTC/USDT")
        timeframe: Timeframe (e.g., "1d", "4h")
        date: Date (UTC midnight) to compute metrics for
        session: Database session

    Returns:
        Dict with gap_percent, outlier_count, volume_consistency
    """
    if outlier_threshold is None:
        outlier_threshold = settings.data_quality_outlier_threshold

    # Ensure date is UTC midnight
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    date = date.replace(hour=0, minute=0, second=0, microsecond=0)

    # Calculate date range for the day
    date_from = date
    date_to = date + timedelta(days=1)

    # Query candles for this day
    stmt = (
        select(Candle)
        .where(Candle.asset == asset)
        .where(Candle.timeframe == timeframe)
        .where(Candle.timestamp >= date_from)
        .where(Candle.timestamp < date_to)
        .order_by(Candle.timestamp)
    )
    candles = list(session.exec(stmt).all())

    # Calculate expected candle count
    interval_seconds = TIMEFRAME_SECONDS.get(timeframe, 3600)
    expected_count = int((date_to.timestamp() - date_from.timestamp()) / interval_seconds)

    # Calculate gap_percent
    actual_count = len(candles)
    if expected_count > 0:
        gap_percent = max(0, (expected_count - actual_count) / expected_count * 100)
    else:
        gap_percent = 0.0

    # Calculate outlier_count (candles with price move above threshold)
    outlier_count = 0
    for candle in candles:
        if candle.open > 0:
            price_change = abs(candle.close / candle.open - 1)
            if price_change > outlier_threshold:
                outlier_count += 1

    # Calculate volume_consistency (% of candles with non-zero volume)
    if actual_count > 0:
        non_zero_volume_count = sum(1 for c in candles if c.volume > 0)
        volume_consistency = non_zero_volume_count / actual_count * 100
    else:
        volume_consistency = 0.0

    return {
        "gap_percent": gap_percent,
        "outlier_count": outlier_count,
        "volume_consistency": volume_consistency,
    }


def check_has_issues(
    gap_percent: float,
    outlier_count: int,
    volume_consistency: float,
    gap_threshold: float | None = None,
    volume_threshold: float | None = None,
) -> bool:
    """
    Check if metrics breach quality thresholds.

    Returns True if any threshold is breached.
    """
    if gap_threshold is None:
        gap_threshold = settings.data_quality_gap_threshold
    if volume_threshold is None:
        volume_threshold = settings.data_quality_volume_threshold

    return (
        gap_percent > gap_threshold
        or outlier_count > 0
        or volume_consistency < volume_threshold
    )


def query_metrics_for_range(
    asset: str,
    timeframe: str,
    date_from: datetime,
    date_to: datetime,
    session: Session,
) -> list[DataQualityMetric]:
    """
    Query metrics table for date range.

    Returns all matching DataQualityMetric rows.
    """
    # Ensure UTC
    if date_from.tzinfo is None:
        date_from = date_from.replace(tzinfo=timezone.utc)
    if date_to.tzinfo is None:
        date_to = date_to.replace(tzinfo=timezone.utc)

    # Normalize to midnight
    date_from = date_from.replace(hour=0, minute=0, second=0, microsecond=0)
    date_to = date_to.replace(hour=0, minute=0, second=0, microsecond=0)

    stmt = (
        select(DataQualityMetric)
        .where(DataQualityMetric.asset == asset)
        .where(DataQualityMetric.timeframe == timeframe)
        .where(DataQualityMetric.date >= date_from)
        .where(DataQualityMetric.date <= date_to)
        .order_by(DataQualityMetric.date)
    )
    return list(session.exec(stmt).all())
