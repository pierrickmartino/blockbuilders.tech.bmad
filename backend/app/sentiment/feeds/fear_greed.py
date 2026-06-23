"""Fear & Greed Index feed — Alternative.me."""
import logging
from datetime import datetime, timezone
from typing import Literal, Optional

import httpx

from app.core.config import settings
from app.schemas.market import HistoryPoint, SentimentIndicator

logger = logging.getLogger(__name__)


def _parse_response(data: dict) -> Optional[SentimentIndicator]:
    """Parse Alternative.me /fng/ response into SentimentIndicator.

    API: {"data": [{"value": "62", "timestamp": "1672531200"}, ...]}
    data[0] is the most recent entry; reversed order gives oldest-first history.
    """
    items = data.get("data")
    if not items:
        return None

    latest = items[0]
    history = [
        HistoryPoint(
            t=datetime.fromtimestamp(int(item["timestamp"]), tz=timezone.utc).strftime(
                "%Y-%m-%d"
            ),
            v=float(item["value"]),
        )
        for item in reversed(items)
    ]
    return SentimentIndicator(value=float(latest["value"]), history=history)


class FearGreedFeed:
    name = "alternative_me_fear_greed"

    def fetch(
        self, asset: str
    ) -> tuple[Optional[SentimentIndicator], Literal["ok", "unavailable"]]:
        try:
            url = f"{settings.alternative_me_api_url}/fng/"
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url, params={"limit": "30"})
                response.raise_for_status()
                indicator = _parse_response(response.json())
                if indicator is None:
                    logger.warning("Alternative.me returned no data")
                    return None, "unavailable"
                return indicator, "ok"
        except Exception as exc:
            logger.error("Failed to fetch Fear & Greed Index: %s", exc)
            return None, "unavailable"
