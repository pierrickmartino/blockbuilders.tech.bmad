"""Market data endpoints (real-time tickers)."""
import json
import logging
from datetime import datetime, timedelta, timezone
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
from app.schemas.market import (
    BacktestSentimentResponse,
    HistoryPoint,
    MarketSentimentResponse,
    SentimentIndicator,
    SourceStatus,
    TickerItem,
    TickerListResponse,
)
from app.schemas.strategy import ALLOWED_ASSETS

logger = logging.getLogger(__name__)

router = APIRouter()

CACHE_TTL_SECONDS = 3  # 3-second cache to reduce vendor calls
CACHE_KEY = "market:tickers"
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


def _fetch_fear_greed_index(days: int = 30) -> tuple[Optional[SentimentIndicator], str]:
    """
    Fetch Fear & Greed Index from Alternative.me.

    Returns:
        (SentimentIndicator | None, status: "ok" | "unavailable")

    API: https://api.alternative.me/fng/?limit={days}
    Response: {"data": [{"value": "62", "timestamp": "1672531200"}]}
    """
    try:
        url = f"{settings.alternative_me_api_url}/fng/"
        params = {"limit": str(days)}

        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if "data" not in data or len(data["data"]) == 0:
                logger.warning("Alternative.me returned no data")
                return None, "unavailable"

            # data[0] is most recent
            latest = data["data"][0]
            history = []

            for item in reversed(data["data"]):  # Oldest first
                timestamp = datetime.fromtimestamp(
                    int(item["timestamp"]), tz=timezone.utc
                )
                history.append(HistoryPoint(
                    t=timestamp.strftime("%Y-%m-%d"),
                    v=float(item["value"])
                ))

            indicator = SentimentIndicator(
                value=float(latest["value"]),
                history=history
            )
            return indicator, "ok"

    except Exception as e:
        logger.error(f"Failed to fetch Fear & Greed Index: {e}")
        return None, "unavailable"


def _fetch_long_short_ratio(asset: str, days: int = 7) -> tuple[Optional[SentimentIndicator], str]:
    """
    Fetch Long/Short Ratio from Binance Futures.

    Returns:
        (SentimentIndicator | None, status: "ok" | "unavailable")

    API: GET /futures/data/globalLongShortAccountRatio?symbol={symbol}&period=1d&limit={days}
    Symbol mapping: BTC/USDT -> BTCUSDT
    Response: [{"symbol": "BTCUSDT", "longShortRatio": "1.75", "longAccount": "0.6364",
               "shortAccount": "0.3636", "timestamp": 1672531200000}]

    Interpretation:
    - Ratio > 1: More traders are long (bullish sentiment)
    - Ratio < 1: More traders are short (bearish sentiment)
    - Ratio = 1: Equal long/short positions (neutral)
    """
    try:
        # Binance symbol format: BTC/USDT -> BTCUSDT
        symbol = asset.replace("/", "")

        url = f"{settings.binance_futures_api_url}/futures/data/globalLongShortAccountRatio"
        params = {
            "symbol": symbol,
            "period": "1d",
            "limit": days
        }

        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if not data or len(data) == 0:
                logger.warning(f"Binance returned no long/short data for {symbol}")
                return None, "unavailable"

            # data is ordered oldest first, last item is most recent
            latest = data[-1]
            history = []

            for item in data:
                timestamp = datetime.fromtimestamp(
                    int(item["timestamp"]) / 1000, tz=timezone.utc
                )
                history.append(HistoryPoint(
                    t=timestamp.strftime("%Y-%m-%d"),
                    v=float(item["longShortRatio"])
                ))

            indicator = SentimentIndicator(
                value=float(latest["longShortRatio"]),
                history=history
            )
            return indicator, "ok"

    except Exception as e:
        logger.error(f"Failed to fetch long/short ratio for {asset}: {e}")
        return None, "unavailable"


def _fetch_funding_rate(asset: str, days: int = 7) -> tuple[Optional[SentimentIndicator], str]:
    """
    Fetch funding rate from Binance perpetual futures.

    Returns:
        (SentimentIndicator | None, status: "ok" | "unavailable")

    API: GET /fapi/v1/fundingRate?symbol={symbol}&limit={limit}
    Symbol mapping: BTC/USDT -> BTCUSDT
    Response: [{"symbol": "BTCUSDT", "fundingTime": 1672531200000, "fundingRate": "0.00010000"}]
    """
    try:
        # Binance symbol format: BTC/USDT -> BTCUSDT
        symbol = asset.replace("/", "")

        url = f"{settings.binance_futures_api_url}/fapi/v1/fundingRate"
        params = {
            "symbol": symbol,
            "limit": days * 3  # 3 funding periods per day (8h intervals)
        }

        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if not data or len(data) == 0:
                logger.warning(f"Binance returned no funding data for {symbol}")
                return None, "unavailable"

            # data[0] is oldest, data[-1] is most recent
            latest = data[-1]
            history = []

            # Group by day and average (since funding occurs 3x daily)
            from collections import defaultdict
            daily_rates = defaultdict(list)

            for item in data:
                timestamp = datetime.fromtimestamp(
                    int(item["fundingTime"]) / 1000, tz=timezone.utc
                )
                date_key = timestamp.strftime("%Y-%m-%d")
                daily_rates[date_key].append(float(item["fundingRate"]))

            for date_key in sorted(daily_rates.keys()):
                avg_rate = sum(daily_rates[date_key]) / len(daily_rates[date_key])
                history.append(HistoryPoint(t=date_key, v=avg_rate))

            indicator = SentimentIndicator(
                value=float(latest["fundingRate"]),
                history=history
            )
            return indicator, "ok"

    except Exception as e:
        logger.error(f"Failed to fetch funding rate for {asset}: {e}")
        return None, "unavailable"


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


@router.get("/market/sentiment", response_model=MarketSentimentResponse)
def get_market_sentiment(
    asset: str = "BTC/USDT",
    user: User = Depends(get_current_user),
) -> MarketSentimentResponse:
    """
    Get market sentiment indicators for a given asset.

    Protected endpoint. Data is cached for 15 minutes.

    Args:
        asset: Trading pair (e.g., "BTC/USDT")

    Returns:
        MarketSentimentResponse with latest values and short history

    Raises:
        HTTPException: 503 if all providers fail, 400 if asset not supported
    """
    # Validate asset
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset {asset} not supported"
        )

    # Try cache first
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

    # Fetch from all providers
    fear_greed, fg_status = _fetch_fear_greed_index(days=30)
    long_short, ls_status = _fetch_long_short_ratio(asset, days=7)
    funding, fr_status = _fetch_funding_rate(asset, days=7)

    # If all providers fail, return 503
    if fg_status == "unavailable" and ls_status == "unavailable" and fr_status == "unavailable":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="All sentiment providers unavailable"
        )

    # Build response with partial data
    response_data = MarketSentimentResponse(
        as_of=datetime.now(timezone.utc),
        asset=asset,
        fear_greed=fear_greed or SentimentIndicator(),
        long_short_ratio=long_short or SentimentIndicator(),
        funding=funding or SentimentIndicator(),
        source_status=SourceStatus(
            fear_greed=fg_status,
            long_short_ratio=ls_status,
            funding=fr_status
        )
    )

    # Cache for 15 minutes
    cache_dict = response_data.model_dump()
    cache_dict["as_of"] = cache_dict["as_of"].isoformat()
    redis.setex(cache_key, SENTIMENT_CACHE_TTL_SECONDS, json.dumps(cache_dict))

    return response_data


@router.get("/backtests/{run_id}/sentiment", response_model=BacktestSentimentResponse)
def get_backtest_sentiment(
    run_id: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BacktestSentimentResponse:
    """
    Get sentiment indicators for a backtest date range.

    Protected endpoint. Reuses cached market sentiment data where possible.

    Args:
        run_id: Backtest run UUID

    Returns:
        BacktestSentimentResponse with start/end/average values

    Raises:
        HTTPException: 404 if backtest not found, 503 if all providers fail
    """
    from app.models.backtest_run import BacktestRun

    # Fetch backtest run
    run = session.get(BacktestRun, run_id)
    if not run or run.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest run not found"
        )

    # Calculate days in backtest range
    delta = (run.date_to - run.date_from).days
    lookback_days = max(30, delta)  # At least 30 days for context

    # Fetch sentiment data (same as market endpoint)
    fear_greed, fg_status = _fetch_fear_greed_index(days=lookback_days)
    long_short, ls_status = _fetch_long_short_ratio(run.asset, days=lookback_days)
    funding, fr_status = _fetch_funding_rate(run.asset, days=lookback_days)

    if fg_status == "unavailable" and ls_status == "unavailable" and fr_status == "unavailable":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="All sentiment providers unavailable"
        )

    # Calculate start/end/average for backtest range
    def get_range_stats(indicator: Optional[SentimentIndicator], start_date: datetime, end_date: datetime):
        """Extract start, end, and average values within date range."""
        if not indicator or not indicator.history:
            return None, None, None

        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")

        # Filter history to backtest range
        in_range = [
            h for h in indicator.history
            if start_str <= h.t <= end_str
        ]

        if not in_range:
            return None, None, None

        start_val = in_range[0].v
        end_val = in_range[-1].v
        avg_val = sum(h.v for h in in_range) / len(in_range)

        return start_val, end_val, avg_val

    fg_start, fg_end, fg_avg = get_range_stats(fear_greed, run.date_from, run.date_to)
    _, _, ls_avg = get_range_stats(long_short, run.date_from, run.date_to)
    _, _, fr_avg = get_range_stats(funding, run.date_from, run.date_to)

    response_data = BacktestSentimentResponse(
        as_of=datetime.now(timezone.utc),
        asset=run.asset,
        date_from=run.date_from,
        date_to=run.date_to,
        fear_greed_start=fg_start,
        fear_greed_end=fg_end,
        fear_greed_avg=fg_avg,
        long_short_ratio_avg=ls_avg,
        funding_avg=fr_avg,
        fear_greed_history=fear_greed.history if fear_greed else [],
        long_short_ratio_history=long_short.history if long_short else [],
        funding_history=funding.history if funding else [],
        source_status=SourceStatus(
            fear_greed=fg_status,
            long_short_ratio=ls_status,
            funding=fr_status
        )
    )

    return response_data
