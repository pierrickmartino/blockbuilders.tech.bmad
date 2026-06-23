"""Sentiment feed seam — singleton assembler wired from the three vendor feeds."""
from app.sentiment.assembler import SentimentAssembler
from app.sentiment.feeds.fear_greed import FearGreedFeed
from app.sentiment.feeds.long_short import LongShortRatioFeed
from app.sentiment.feeds.funding import FundingRateFeed

assembler = SentimentAssembler(
    fear_greed_feed=FearGreedFeed(),
    long_short_feed=LongShortRatioFeed(),
    funding_feed=FundingRateFeed(),
)
