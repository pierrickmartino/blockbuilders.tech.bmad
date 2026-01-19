"""Market data endpoints (real-time tickers)."""
import json
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis
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
from app.schemas.market import TickerItem, TickerListResponse
from app.schemas.strategy import ALLOWED_ASSETS

logger = logging.getLogger(__name__)

router = APIRouter()

CACHE_TTL_SECONDS = 3  # 3-second cache to reduce vendor calls
CACHE_KEY = "market:tickers"


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
    """
    Get real-time price tickers for all supported pairs.

    Protected endpoint. Data is cached for 3 seconds to reduce vendor API calls.

    Returns:
        TickerListResponse containing ticker items and timestamp

    Raises:
        HTTPException: 503 if market data provider is unavailable
    """
    # Try cache first
    redis = _get_redis()
    cached = redis.get(CACHE_KEY)
    if cached:
        cached_data = json.loads(cached)
        # Parse as_of back to datetime for response model
        cached_data["as_of"] = datetime.fromisoformat(cached_data["as_of"])
        return TickerListResponse(**cached_data)

    # Extract base symbols from ALLOWED_ASSETS (BTC/USDT -> BTC)
    fsyms = [asset.split("/")[0] for asset in ALLOWED_ASSETS]
    fsyms_str = ",".join(fsyms)

    # Call CryptoCompare pricemultifull
    try:
        with httpx.Client(timeout=10.0) as client:
            url = f"{settings.cryptocompare_api_url}/pricemultifull"
            params = {
                "fsyms": fsyms_str,
                "tsyms": "USDT",
            }
            if settings.cryptocompare_api_key:
                params["api_key"] = settings.cryptocompare_api_key

            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if data.get("Response") == "Error":
                logger.error(f"CryptoCompare error: {data.get('Message')}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Market data provider unavailable",
                )

    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch tickers: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Market data provider unavailable",
        )

    # Transform response to our schema
    raw_data = data.get("RAW", {})
    items = []

    for asset in ALLOWED_ASSETS:
        base = asset.split("/")[0]
        ticker_data = raw_data.get(base, {}).get("USDT")

        if ticker_data:
            price = ticker_data.get("PRICE", 0.0)

            # Calculate volatility metrics from DB
            vol_metrics = _calculate_volatility_metrics(asset, price, session)

            items.append(
                TickerItem(
                    pair=asset,
                    price=price,
                    change_24h_pct=ticker_data.get("CHANGEPCT24HOUR", 0.0),
                    volume_24h=ticker_data.get("VOLUME24HOURTO", 0.0),
                    volatility_stddev=vol_metrics["volatility_stddev"],
                    volatility_atr_pct=vol_metrics["volatility_atr_pct"],
                    volatility_percentile_1y=vol_metrics["volatility_percentile_1y"],
                )
            )
        else:
            # Data unavailable for this pair - use zeros/None
            logger.warning(f"No ticker data for {asset}")
            items.append(
                TickerItem(
                    pair=asset,
                    price=0.0,
                    change_24h_pct=0.0,
                    volume_24h=0.0,
                    volatility_stddev=None,
                    volatility_atr_pct=None,
                    volatility_percentile_1y=None,
                )
            )

    # Build response
    response_data = TickerListResponse(
        items=items,
        as_of=datetime.now(timezone.utc),
    )

    # Cache for CACHE_TTL_SECONDS
    # Convert datetime to ISO string for JSON serialization
    cache_dict = response_data.model_dump()
    cache_dict["as_of"] = cache_dict["as_of"].isoformat()
    redis.setex(CACHE_KEY, CACHE_TTL_SECONDS, json.dumps(cache_dict))

    return response_data
