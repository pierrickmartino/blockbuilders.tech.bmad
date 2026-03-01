"""Market data response schemas."""
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel


class TickerItem(BaseModel):
    """Single ticker item for a trading pair."""

    pair: str
    price: float
    change_24h_pct: float
    volume_24h: float
    volatility_stddev: Optional[float] = None
    volatility_atr_pct: Optional[float] = None
    volatility_percentile_1y: Optional[float] = None


class TickerListResponse(BaseModel):
    """Response containing all ticker items."""

    items: list[TickerItem]
    as_of: datetime


class HistoryPoint(BaseModel):
    """Single timestamp-value pair for history data."""

    t: str  # ISO date string (YYYY-MM-DD)
    v: float


class SentimentIndicator(BaseModel):
    """Single sentiment indicator with current value and history."""

    value: Optional[float] = None  # Current value
    history: list[HistoryPoint] = []  # Historical points (7-30 days)


class SourceStatus(BaseModel):
    """Status flags for each data source."""

    fear_greed: Literal["ok", "partial", "unavailable"]
    long_short_ratio: Literal["ok", "partial", "unavailable"]
    funding: Literal["ok", "partial", "unavailable"]


class MarketSentimentResponse(BaseModel):
    """Response for /market/sentiment endpoint."""

    as_of: datetime
    asset: str
    fear_greed: SentimentIndicator
    long_short_ratio: SentimentIndicator
    funding: SentimentIndicator
    source_status: SourceStatus


class DataAvailabilityResponse(BaseModel):
    """Response for /market/data-availability endpoint."""

    asset: str
    timeframe: str
    earliest_date: Optional[date] = None
    latest_date: Optional[date] = None
    source: str  # "metadata" or "candle_fallback"


class BacktestSentimentResponse(BaseModel):
    """Response for /backtests/{run_id}/sentiment endpoint."""

    as_of: datetime
    asset: str
    date_from: datetime
    date_to: datetime
    fear_greed_start: Optional[float] = None
    fear_greed_end: Optional[float] = None
    fear_greed_avg: Optional[float] = None
    long_short_ratio_avg: Optional[float] = None
    funding_avg: Optional[float] = None
    fear_greed_history: list[HistoryPoint] = []
    long_short_ratio_history: list[HistoryPoint] = []
    funding_history: list[HistoryPoint] = []
    source_status: SourceStatus
