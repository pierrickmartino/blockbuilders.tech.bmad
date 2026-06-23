"""Market data endpoints (real-time tickers)."""
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from redis import Redis
from rq import Queue
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.backtest.volatility import (
    calculate_atr_pct,
    calculate_stddev_volatility,
    calculate_volatility_percentile,
)
from app.core.config import settings
from app.core.database import get_session
from app.models.candle import Candle
from app.models.user import User
from app.models.data_quality_metric import DataQualityMetric
from app.schemas.market import (
    DataAvailabilityResponse,
    MarketSentimentResponse,
    SentimentIndicator,
    SourceStatus,
    TickerItem,
    TickerListResponse,
)
from app.schemas.strategy import ALLOWED_ASSETS
from app.sentiment import assembler as _sentiment_assembler
from app.services.spot_price_cache import SpotPriceCache

logger = logging.getLogger(__name__)

router = APIRouter()

SENTIMENT_CACHE_TTL_SECONDS = 900  # 15-minute cache for sentiment data


def _get_redis() -> Redis:
    """Get Redis connection for caching."""
    return Redis.from_url(settings.redis_url)


def _fetch_candles_for_asset(asset: str, session: Session) -> Optional[list[Candle]]:
    """Fetch up to 365 daily candles for an asset.

    Returns None if insufficient data exists (less than 30 candles).
    """
    try:
        candles = session.exec(
            select(Candle)
            .where(Candle.asset == asset, Candle.timeframe == "1d")
            .order_by(Candle.timestamp.desc())
            .limit(365)
        ).all()

        if len(candles) < 30:  # Need minimum 30 for current volatility
            return None

        # Reverse to chronological order (oldest first)
        return list(reversed(candles))
    except Exception as e:
        logger.error(f"Failed to fetch candles for {asset}: {e}")
        return None


def _calculate_volatility_metrics(asset: str, current_price: float, session: Session) -> dict:
    """Calculate all three volatility metrics for an asset.

    Returns dict with volatility_stddev, volatility_atr_pct, volatility_percentile_1y.
    All values are None if insufficient data.
    """
    candles = _fetch_candles_for_asset(asset, session)

    if not candles:
        return {
            "volatility_stddev": None,
            "volatility_atr_pct": None,
            "volatility_percentile_1y": None,
        }

    closes = [c.close for c in candles]
    highs = [c.high for c in candles]
    lows = [c.low for c in candles]

    try:
        stddev_vol = calculate_stddev_volatility(closes, window=30)
        atr_pct = calculate_atr_pct(highs, lows, closes, current_price, window=30)
        percentile = calculate_volatility_percentile(closes, window=30, history_days=365)

        return {
            "volatility_stddev": stddev_vol,
            "volatility_atr_pct": atr_pct,
            "volatility_percentile_1y": percentile,
        }
    except Exception as e:
        logger.error(f"Failed to calculate volatility for {asset}: {e}")
        return {
            "volatility_stddev": None,
            "volatility_atr_pct": None,
            "volatility_percentile_1y": None,
        }



@router.get("/market/tickers", response_model=TickerListResponse)
def get_tickers(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TickerListResponse:
    """Return spot prices from the single-writer SpotPriceCache (stale-while-revalidate).

    Never calls a price provider directly. On cold cache, enqueues a one-shot
    refresh (deduped) and returns 503 so the client retries.

    Raises:
        HTTPException: 503 if the cache is cold (job hasn't run yet)
    """
    redis = _get_redis()
    cache = SpotPriceCache(redis)

    cache.mark_viewed()

    cached = cache.read()

    if cached is None:
        # Cold cache: trigger a one-shot refresh if not already pending
        if cache.set_refresh_pending():
            queue = Queue("default", connection=redis)
            queue.enqueue("app.worker.jobs.refresh_spot_prices")
            logger.info("get_tickers: cold cache — enqueued one-shot refresh")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Market data initialising — please retry in a few seconds",
        )

    # Enrich with DB volatility (no external calls)
    enriched_items = [
        TickerItem(
            pair=item.pair,
            price=item.price,
            change_24h_pct=item.change_24h_pct,
            volume_24h=item.volume_24h,
            **_calculate_volatility_metrics(item.pair, item.price, session),
        )
        for item in cached.items
    ]

    return TickerListResponse(items=enriched_items, as_of=cached.as_of)


@router.get("/market/data-availability", response_model=DataAvailabilityResponse)
def get_data_availability(
    asset: str = Query(..., description="Asset pair (e.g., BTC/USDT)"),
    timeframe: str = Query(..., description="Timeframe (e.g., 1d, 4h)"),
    session: Session = Depends(get_session),
) -> DataAvailabilityResponse:
    """Get data availability date range for asset/timeframe.

    Prefers cached metadata from data_quality_metrics; falls back to candle min/max.
    No authentication required.
    """
    # Try metadata first: most recent row with earliest_candle_date populated
    stmt = (
        select(DataQualityMetric)
        .where(DataQualityMetric.asset == asset)
        .where(DataQualityMetric.timeframe == timeframe)
        .where(DataQualityMetric.earliest_candle_date.is_not(None))  # type: ignore[union-attr]
        .order_by(DataQualityMetric.date.desc())
        .limit(1)
    )
    metric = session.exec(stmt).first()

    if metric and metric.earliest_candle_date:
        return DataAvailabilityResponse(
            asset=asset,
            timeframe=timeframe,
            earliest_date=metric.earliest_candle_date,
            latest_date=metric.latest_candle_date,
            source="metadata",
        )

    # Fallback: query candles directly
    from sqlmodel import func as sqlfunc

    fallback_stmt = (
        select(sqlfunc.min(Candle.timestamp), sqlfunc.max(Candle.timestamp))
        .where(Candle.asset == asset)
        .where(Candle.timeframe == timeframe)
    )
    result = session.exec(fallback_stmt).first()

    if not result or result[0] is None:
        return DataAvailabilityResponse(
            asset=asset,
            timeframe=timeframe,
            source="candle_fallback",
        )

    return DataAvailabilityResponse(
        asset=asset,
        timeframe=timeframe,
        earliest_date=result[0].date() if result[0] else None,
        latest_date=result[1].date() if result[1] else None,
        source="candle_fallback",
    )


@router.get("/market/sentiment", response_model=MarketSentimentResponse)
def get_market_sentiment(
    asset: str = "BTC/USDT",
    user: User = Depends(get_current_user),
) -> MarketSentimentResponse:
    """Get market sentiment indicators for a given asset.

    Protected endpoint. Data is cached for 15 minutes.
    Returns 503 when all three feeds are unavailable; 400 for unsupported assets.
    """
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset {asset} not supported",
        )

    cache_key = f"market:sentiment:{asset}"
    redis = _get_redis()
    cached = redis.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        cached_data["as_of"] = datetime.fromisoformat(cached_data["as_of"])
        cached_data["fear_greed"] = SentimentIndicator(**cached_data["fear_greed"])
        cached_data["long_short_ratio"] = SentimentIndicator(**cached_data["long_short_ratio"])
        cached_data["funding"] = SentimentIndicator(**cached_data["funding"])
        cached_data["source_status"] = SourceStatus(**cached_data["source_status"])
        return MarketSentimentResponse(**cached_data)

    snapshot = _sentiment_assembler.collect(asset)

    ss = snapshot.source_status
    if ss.fear_greed == "unavailable" and ss.long_short_ratio == "unavailable" and ss.funding == "unavailable":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="All sentiment providers unavailable",
        )

    cache_dict = snapshot.model_dump()
    cache_dict["as_of"] = cache_dict["as_of"].isoformat()
    redis.setex(cache_key, SENTIMENT_CACHE_TTL_SECONDS, json.dumps(cache_dict))

    return snapshot


