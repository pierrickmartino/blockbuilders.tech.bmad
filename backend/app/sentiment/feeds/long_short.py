"""Long/Short Ratio feed — Binance Futures."""
import logging
from datetime import datetime, timezone
from typing import Literal, Optional

import httpx

from app.core.config import settings
from app.schemas.market import HistoryPoint, SentimentIndicator

logger = logging.getLogger(__name__)


def _parse_response(data: list[dict]) -> Optional[SentimentIndicator]:
    """Parse Binance globalLongShortAccountRatio response.

    API: [{"symbol":"BTCUSDT","longShortRatio":"1.75","timestamp":1672531200000}, ...]
    Ordered oldest-first; last item is the most recent.
    """
    if not data:
        return None

    latest = data[-1]
    history = [
        HistoryPoint(
            t=datetime.fromtimestamp(
                int(item["timestamp"]) / 1000, tz=timezone.utc
            ).strftime("%Y-%m-%d"),
            v=float(item["longShortRatio"]),
        )
        for item in data
    ]
    return SentimentIndicator(value=float(latest["longShortRatio"]), history=history)


class LongShortRatioFeed:
    name = "binance_long_short_ratio"

    def fetch(
        self, asset: str
    ) -> tuple[Optional[SentimentIndicator], Literal["ok", "unavailable"]]:
        try:
            symbol = asset.replace("/", "")
            url = f"{settings.binance_futures_api_url}/futures/data/globalLongShortAccountRatio"
            with httpx.Client(timeout=10.0) as client:
                response = client.get(
                    url, params={"symbol": symbol, "period": "1d", "limit": 7}
                )
                response.raise_for_status()
                indicator = _parse_response(response.json())
                if indicator is None:
                    logger.warning("Binance returned no long/short data for %s", symbol)
                    return None, "unavailable"
                return indicator, "ok"
        except Exception as exc:
            logger.error("Failed to fetch long/short ratio for %s: %s", asset, exc)
            return None, "unavailable"
