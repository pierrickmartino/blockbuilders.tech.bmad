"""Data quality validation service."""
from datetime import datetime, timedelta, timezone
import logging

from sqlmodel import Session, select, func

from app.backtest.candles import TIMEFRAME_SECONDS, _detect_gaps
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


def compute_completeness_metrics(
    asset: str,
    timeframe: str,
    session: Session,
) -> dict:
    """
    Compute completeness metrics for asset/timeframe.

    Returns dict with:
    - coverage_start: datetime (earliest candle)
    - coverage_end: datetime (latest candle)
    - completeness_percent: float (% of expected candles that exist)
    - gap_count: int (number of gap periods)
    - gap_total_hours: float (total missing time)
    - gap_ranges: list[dict] with {start, end} for each gap
    """
    # Query coverage range and count
    stmt = (
        select(
            func.min(Candle.timestamp),
            func.max(Candle.timestamp),
            func.count(Candle.id)
        )
        .where(Candle.asset == asset)
        .where(Candle.timeframe == timeframe)
    )
    result = session.exec(stmt).first()

    # Handle case where no candles exist
    if not result or result[0] is None:
        return {
            "coverage_start": None,
            "coverage_end": None,
            "completeness_percent": 0.0,
            "gap_count": 0,
            "gap_total_hours": 0.0,
            "gap_ranges": [],
        }

    coverage_start, coverage_end, actual_count = result

    # Calculate expected candle count
    interval_seconds = TIMEFRAME_SECONDS.get(timeframe, 3600)
    time_diff = (coverage_end - coverage_start).total_seconds()
    expected_count = int(time_diff / interval_seconds) + 1

    # Calculate completeness percent
    if expected_count > 0:
        completeness_percent = (actual_count / expected_count) * 100
    else:
        completeness_percent = 100.0

    # Query all candles to detect gaps
    candles_stmt = (
        select(Candle)
        .where(Candle.asset == asset)
        .where(Candle.timeframe == timeframe)
        .order_by(Candle.timestamp)
    )
    candles = list(session.exec(candles_stmt).all())

    # Detect gaps (using threshold of 0 to catch all gaps)
    gaps = _detect_gaps(candles, timeframe, max_gap_candles=0)

    # Calculate gap metrics
    gap_count = len(gaps)
    gap_total_seconds = sum((end - start).total_seconds() for start, end in gaps)
    gap_total_hours = gap_total_seconds / 3600

    # Format gap ranges
    gap_ranges = [
        {"start": start, "end": end}
        for start, end in gaps
    ]

    return {
        "coverage_start": coverage_start,
        "coverage_end": coverage_end,
        "completeness_percent": completeness_percent,
        "gap_count": gap_count,
        "gap_total_hours": gap_total_hours,
        "gap_ranges": gap_ranges,
    }
