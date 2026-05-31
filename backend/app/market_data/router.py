"""PriceRouter: the sole entry point for spot and candle reads."""
import logging
from datetime import datetime

from app.market_data.protocol import CandleData, PriceProvider, PriceUnavailableError, SpotPrice

logger = logging.getLogger(__name__)


class PriceRouter:
    """Routes price requests through an ordered list of providers.

    Tries each provider in order; raises PriceUnavailableError only when
    all providers have failed.
    """

    def __init__(self, providers: list[PriceProvider]) -> None:
        self._providers = providers

    def get_spot_prices(self, assets: list[str]) -> dict[str, SpotPrice]:
        last_error: Exception | None = None
        for provider in self._providers:
            try:
                return provider.get_spot_prices(assets)
            except Exception as exc:
                logger.warning("Provider %s failed spot fetch: %s", provider.name, exc)
                last_error = exc
        raise PriceUnavailableError(f"All providers failed: {last_error}")

    def get_candles(
        self,
        asset: str,
        timeframe: str,
        date_from: datetime,
        date_to: datetime,
    ) -> list[CandleData]:
        last_error: Exception | None = None
        for provider in self._providers:
            try:
                return provider.get_candles(asset, timeframe, date_from, date_to)
            except Exception as exc:
                logger.warning("Provider %s failed candle fetch: %s", provider.name, exc)
                last_error = exc
        raise PriceUnavailableError(f"All providers failed: {last_error}")
