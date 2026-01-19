"""Market data response schemas."""
from datetime import datetime
from typing import Optional

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
