"""Funding Rate feed — Binance perpetual futures."""
import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Literal, Optional

import httpx

from app.core.config import settings
from app.schemas.market import HistoryPoint, SentimentIndicator

logger = logging.getLogger(__name__)


def _parse_response(data: list[dict]) -> Optional[SentimentIndicator]:
    """Parse Binance fundingRate response.

    API: [{"symbol":"BTCUSDT","fundingTime":1672531200000,"fundingRate":"0.0001"}, ...]
    Funding occurs 3× per day; daily rates are averaged for history.
    """
    if not data:
        return None

    latest = data[-1]

    daily_rates: dict[str, list[float]] = defaultdict(list)
    for item in data:
        date_key = datetime.fromtimestamp(
            int(item["fundingTime"]) / 1000, tz=timezone.utc
        ).strftime("%Y-%m-%d")
        daily_rates[date_key].append(float(item["fundingRate"]))

    history = [
        HistoryPoint(t=date_key, v=sum(rates) / len(rates))
        for date_key, rates in sorted(daily_rates.items())
    ]
    return SentimentIndicator(value=float(latest["fundingRate"]), history=history)


class FundingRateFeed:
    name = "binance_funding_rate"

    def fetch(
        self, asset: str
    ) -> tuple[Optional[SentimentIndicator], Literal["ok", "unavailable"]]:
        try:
            symbol = asset.replace("/", "")
            url = f"{settings.binance_futures_api_url}/fapi/v1/fundingRate"
            with httpx.Client(timeout=10.0) as client:
                response = client.get(
                    url, params={"symbol": symbol, "limit": 21}  # 7 days × 3 per day
                )
                response.raise_for_status()
                indicator = _parse_response(response.json())
                if indicator is None:
                    logger.warning("Binance returned no funding data for %s", symbol)
                    return None, "unavailable"
                return indicator, "ok"
        except Exception as exc:
            logger.error("Failed to fetch funding rate for %s: %s", asset, exc)
            return None, "unavailable"
