"""SentimentAssembler — collects the three feeds into one snapshot."""
from datetime import datetime, timezone

from app.schemas.market import (
    MarketSentimentResponse,
    SentimentIndicator,
    SourceStatus,
)
from app.sentiment.protocol import SentimentFeed


class SentimentAssembler:
    def __init__(
        self,
        fear_greed_feed: SentimentFeed,
        long_short_feed: SentimentFeed,
        funding_feed: SentimentFeed,
    ) -> None:
        self._fear_greed = fear_greed_feed
        self._long_short = long_short_feed
        self._funding = funding_feed

    def collect(self, asset: str) -> MarketSentimentResponse:
        """Fetch all three feeds and combine into a single snapshot.

        Partial failures are captured in source_status; callers decide
        whether an all-unavailable snapshot warrants a 503 response.
        """
        fear_greed, fg_status = self._fear_greed.fetch(asset)
        long_short, ls_status = self._long_short.fetch(asset)
        funding, fr_status = self._funding.fetch(asset)

        return MarketSentimentResponse(
            as_of=datetime.now(timezone.utc),
            asset=asset,
            fear_greed=fear_greed or SentimentIndicator(),
            long_short_ratio=long_short or SentimentIndicator(),
            funding=funding or SentimentIndicator(),
            source_status=SourceStatus(
                fear_greed=fg_status,
                long_short_ratio=ls_status,
                funding=fr_status,
            ),
        )
