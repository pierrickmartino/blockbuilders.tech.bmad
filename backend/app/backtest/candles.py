"""Candle fetching service: DB cache + vendor via PriceRouter."""
from datetime import datetime, timezone
import logging

from sqlmodel import Session, select

from app.core.config import settings
from app.market_data import price_router
from app.market_data.protocol import PriceUnavailableError
from app.models.candle import Candle
from app.backtest.errors import DataUnavailableError

logger = logging.getLogger(__name__)

# Timeframe to seconds mapping
TIMEFRAME_SECONDS = {
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
}


def fetch_candles(
    asset: str,
    timeframe: str,
    date_from: datetime,
    date_to: datetime,
    session: Session,
    force_refresh: bool = False,
) -> list[Candle]:
    """
    Fetch candles from DB, fill gaps from vendor, return sorted list.
    When force_refresh=True, always fetch from vendor and overwrite existing
    candles in the requested range.
    Raises DataUnavailableError if large gaps or vendor unavailable.
    """
    # Ensure UTC
    if date_from.tzinfo is None:
        date_from = date_from.replace(tzinfo=timezone.utc)
    if date_to.tzinfo is None:
        date_to = date_to.replace(tzinfo=timezone.utc)

    # Query existing candles from DB
    stmt = (
        select(Candle)
        .where(Candle.asset == asset)
        .where(Candle.timeframe == timeframe)
        .where(Candle.timestamp >= date_from)
        .where(Candle.timestamp <= date_to)
        .order_by(Candle.timestamp)
    )
    db_candles = list(session.exec(stmt).all())

    # Calculate expected candle count
    interval_seconds = TIMEFRAME_SECONDS.get(timeframe, 3600)
    expected_count = int((date_to.timestamp() - date_from.timestamp()) / interval_seconds) + 1

    # Check if we have enough candles AND they cover the requested end date
    # The 95% threshold alone isn't enough - we must also verify the latest
    # cached candle is close to date_to, otherwise we'd skip fetching fresh data
    if not force_refresh and len(db_candles) >= expected_count * 0.95:  # 95% threshold
        if db_candles:
            latest_candle_ts = db_candles[-1].timestamp
            # Allow up to 2 candle intervals of slack for the end date
            max_end_gap = interval_seconds * 2
            if (date_to.timestamp() - latest_candle_ts.timestamp()) <= max_end_gap:
                return db_candles
        else:
            return db_candles

    # Fetch missing candles from vendor via PriceRouter
    logger.info(
        "Fetching candles from vendor: %s %s %s - %s (force_refresh=%s)",
        asset,
        timeframe,
        date_from,
        date_to,
        force_refresh,
    )
    try:
        vendor_candles = price_router.get_candles(asset, timeframe, date_from, date_to)
    except PriceUnavailableError as exc:
        raise DataUnavailableError(str(exc), "Data provider unavailable. Please try again later.") from exc

    # Store fetched candles to DB (batch upsert pattern)
    if vendor_candles:
        # Batch lookup: get all existing timestamps in one query
        vendor_timestamps = [c.timestamp for c in vendor_candles]
        existing_stmt = (
            select(Candle)
            .where(Candle.asset == asset)
            .where(Candle.timeframe == timeframe)
            .where(Candle.timestamp.in_(vendor_timestamps))
        )
        existing_by_ts: dict[datetime, Candle] = {}
        for existing in session.exec(existing_stmt).all():
            ts = existing.timestamp
            normalized = ts.replace(tzinfo=None) if ts.tzinfo is not None else ts
            existing_by_ts[normalized] = existing

        new_candles: list[Candle] = []
        updated_count = 0

        for c in vendor_candles:
            normalized_ts = c.timestamp.replace(tzinfo=None)
            existing = existing_by_ts.get(normalized_ts)

            if existing is None:
                new_candles.append(
                    Candle(
                        asset=asset,
                        timeframe=timeframe,
                        timestamp=c.timestamp,
                        open=c.open,
                        high=c.high,
                        low=c.low,
                        close=c.close,
                        volume=c.volume,
                    )
                )
                continue

            if force_refresh:
                changed = False
                if existing.open != c.open:
                    existing.open = c.open
                    changed = True
                if existing.high != c.high:
                    existing.high = c.high
                    changed = True
                if existing.low != c.low:
                    existing.low = c.low
                    changed = True
                if existing.close != c.close:
                    existing.close = c.close
                    changed = True
                if existing.volume != c.volume:
                    existing.volume = c.volume
                    changed = True
                if changed:
                    session.add(existing)
                    updated_count += 1

        if new_candles:
            session.add_all(new_candles)
        if new_candles or updated_count:
            session.commit()

    # Re-query to get all candles sorted
    db_candles = list(session.exec(stmt).all())

    # Check for gaps
    gaps = _detect_gaps(db_candles, timeframe, settings.max_gap_candles)
    if gaps:
        gap_msg = f"Missing price data from {gaps[0][0]} to {gaps[0][1]}"
        raise DataUnavailableError(gap_msg, f"{gap_msg}. Please try a shorter period.")

    return db_candles


def _detect_gaps(
    candles: list[Candle],
    timeframe: str,
    max_gap_candles: int,
) -> list[tuple[datetime, datetime]]:
    """Return list of (start, end) gaps larger than threshold."""
    if len(candles) < 2:
        return []

    interval_seconds = TIMEFRAME_SECONDS.get(timeframe, 3600)
    gaps = []

    for i in range(1, len(candles)):
        prev_ts = candles[i - 1].timestamp
        curr_ts = candles[i].timestamp
        diff_seconds = (curr_ts - prev_ts).total_seconds()
        expected_diff = interval_seconds
        gap_candles = int(diff_seconds / interval_seconds) - 1

        if gap_candles > max_gap_candles:
            gap_start = prev_ts
            gap_end = curr_ts
            gaps.append((gap_start, gap_end))

    return gaps
