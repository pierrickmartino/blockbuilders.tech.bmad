"""Candle fetching service: DB cache + CryptoCompare vendor."""
from datetime import datetime, timezone
import logging

import httpx
from sqlmodel import Session, select

from app.core.config import settings
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
) -> list[Candle]:
    """
    Fetch candles from DB, fill gaps from vendor, return sorted list.
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

    # If we have enough candles, return them
    if len(db_candles) >= expected_count * 0.95:  # 95% threshold
        return db_candles

    # Fetch missing candles from vendor
    logger.info(f"Fetching candles from vendor: {asset} {timeframe} {date_from} - {date_to}")
    vendor_candles = _fetch_from_vendor(asset, timeframe, date_from, date_to)

    # Store fetched candles to DB (upsert pattern)
    for candle_data in vendor_candles:
        existing = session.exec(
            select(Candle)
            .where(Candle.asset == asset)
            .where(Candle.timeframe == timeframe)
            .where(Candle.timestamp == candle_data["timestamp"])
        ).first()
        if not existing:
            candle = Candle(
                asset=asset,
                timeframe=timeframe,
                timestamp=candle_data["timestamp"],
                open=candle_data["open"],
                high=candle_data["high"],
                low=candle_data["low"],
                close=candle_data["close"],
                volume=candle_data["volume"],
            )
            session.add(candle)
    session.commit()

    # Re-query to get all candles sorted
    db_candles = list(session.exec(stmt).all())

    # Check for gaps
    gaps = _detect_gaps(db_candles, timeframe, settings.max_gap_candles)
    if gaps:
        gap_msg = f"Missing price data from {gaps[0][0]} to {gaps[0][1]}"
        raise DataUnavailableError(gap_msg, f"{gap_msg}. Please try a shorter period.")

    return db_candles


def _fetch_from_vendor(
    asset: str,
    timeframe: str,
    date_from: datetime,
    date_to: datetime,
) -> list[dict]:
    """Call CryptoCompare API, return raw candle dicts."""
    # Parse asset pair (e.g., "BTC/USDT" -> fsym="BTC", tsym="USDT")
    parts = asset.split("/")
    if len(parts) != 2:
        raise DataUnavailableError(f"Invalid asset format: {asset}", "Invalid trading pair format.")
    fsym, tsym = parts

    # Determine endpoint based on timeframe
    if timeframe in ("1h", "4h"):
        endpoint = "histohour"
    else:
        endpoint = "histoday"

    # Calculate limit (max 2000 per request)
    interval_seconds = TIMEFRAME_SECONDS.get(timeframe, 3600)
    total_candles = int((date_to.timestamp() - date_from.timestamp()) / interval_seconds) + 1

    all_candles = []
    current_to_ts = int(date_to.timestamp())
    remaining = total_candles

    try:
        with httpx.Client(timeout=30.0) as client:
            while remaining > 0:
                limit = min(remaining, 2000)
                url = f"{settings.cryptocompare_api_url}/{endpoint}"
                params = {
                    "fsym": fsym,
                    "tsym": tsym,
                    "limit": limit,
                    "toTs": current_to_ts,
                }
                if settings.cryptocompare_api_key:
                    params["api_key"] = settings.cryptocompare_api_key

                response = client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                if data.get("Response") == "Error":
                    raise DataUnavailableError(
                        data.get("Message", "Unknown vendor error"),
                        "Data provider returned an error.",
                    )

                candles_data = data.get("Data", {}).get("Data", [])
                if not candles_data:
                    break

                for c in candles_data:
                    ts = datetime.fromtimestamp(c["time"], tz=timezone.utc)
                    if date_from <= ts <= date_to:
                        all_candles.append({
                            "timestamp": ts,
                            "open": float(c["open"]),
                            "high": float(c["high"]),
                            "low": float(c["low"]),
                            "close": float(c["close"]),
                            "volume": float(c.get("volumefrom", 0)),
                        })

                # Move to earlier timestamp for next batch
                earliest_ts = min(c["time"] for c in candles_data)
                if earliest_ts >= current_to_ts:
                    break
                current_to_ts = earliest_ts - 1
                remaining -= len(candles_data)

    except httpx.HTTPError as e:
        logger.error(f"Vendor API error: {e}")
        raise DataUnavailableError(str(e), "Data provider unavailable. Please try again later.")

    # Sort by timestamp ascending
    all_candles.sort(key=lambda x: x["timestamp"])

    # Handle 4h aggregation if needed
    if timeframe == "4h" and all_candles:
        all_candles = _aggregate_to_4h(all_candles)

    return all_candles


def _aggregate_to_4h(hourly_candles: list[dict]) -> list[dict]:
    """Aggregate hourly candles to 4-hour candles."""
    if not hourly_candles:
        return []

    aggregated = []
    current_group = []

    for candle in hourly_candles:
        ts = candle["timestamp"]
        # 4h candle starts at hours divisible by 4 (0, 4, 8, 12, 16, 20)
        hour = ts.hour
        is_start = hour % 4 == 0

        if is_start and current_group:
            aggregated.append(_merge_candles(current_group))
            current_group = []

        current_group.append(candle)

    # Don't forget the last group
    if current_group:
        aggregated.append(_merge_candles(current_group))

    return aggregated


def _merge_candles(candles: list[dict]) -> dict:
    """Merge multiple candles into one OHLCV candle."""
    return {
        "timestamp": candles[0]["timestamp"],
        "open": candles[0]["open"],
        "high": max(c["high"] for c in candles),
        "low": min(c["low"] for c in candles),
        "close": candles[-1]["close"],
        "volume": sum(c["volume"] for c in candles),
    }


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
