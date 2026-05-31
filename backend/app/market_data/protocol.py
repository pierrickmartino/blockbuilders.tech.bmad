"""PriceProvider protocol and shared value types for market data."""
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Protocol


class PriceUnavailableError(Exception):
    """Raised when no provider can return the requested market data."""


@dataclass(frozen=True)
class SpotPrice:
    """Spot price snapshot for a single trading pair."""

    price: Decimal
    change_24h_pct: float
    volume_24h: float


@dataclass(frozen=True)
class CandleData:
    """OHLCV candle returned by a price provider."""

    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class PriceProvider(Protocol):
    """Structural protocol every price-data provider must satisfy."""

    name: str

    def get_spot_prices(self, assets: list[str]) -> dict[str, SpotPrice]: ...

    def get_candles(
        self,
        asset: str,
        timeframe: str,
        date_from: datetime,
        date_to: datetime,
    ) -> list[CandleData]: ...
