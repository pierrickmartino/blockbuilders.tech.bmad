"""Market data endpoints (real-time tickers)."""
import json
import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis

from app.api.deps import get_current_user
from app.core.config import settings
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


@router.get("/market/tickers", response_model=TickerListResponse)
def get_tickers(user: User = Depends(get_current_user)) -> TickerListResponse:
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
            items.append(
                TickerItem(
                    pair=asset,
                    price=ticker_data.get("PRICE", 0.0),
                    change_24h_pct=ticker_data.get("CHANGEPCT24HOUR", 0.0),
                    volume_24h=ticker_data.get("VOLUME24HOURTO", 0.0),
                )
            )
        else:
            # Data unavailable for this pair - use zeros
            logger.warning(f"No ticker data for {asset}")
            items.append(
                TickerItem(
                    pair=asset,
                    price=0.0,
                    change_24h_pct=0.0,
                    volume_24h=0.0,
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
