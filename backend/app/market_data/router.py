"""PriceRouter: the sole entry point for spot and candle reads."""
import logging
from datetime import datetime

from app.market_data.circuit_breaker import CircuitBreaker, FailureKind
from app.market_data.protocol import CandleData, PriceProvider, PriceUnavailableError, ProviderQuotaError, SpotPrice

logger = logging.getLogger(__name__)


class PriceRouter:
    """Routes price requests through per-surface ordered provider lists.

    Spot and candles can use *different* primary providers (ADR-0003:
    spot is Binance-primary, candles are CryptoCompare-primary). Each
    surface tries its providers in order; raises PriceUnavailableError
    only when all providers have failed or been skipped as unhealthy.

    `providers` sets the default order for both surfaces. Pass
    `spot_order` and/or `candle_order` to override a surface's ordering
    (typically the same provider instances in a different sequence).
    """

    def __init__(
        self,
        providers: list[PriceProvider],
        circuit_breaker: CircuitBreaker | None = None,
        spot_order: list[PriceProvider] | None = None,
        candle_order: list[PriceProvider] | None = None,
    ) -> None:
        self._spot_providers = spot_order if spot_order is not None else providers
        self._candle_providers = candle_order if candle_order is not None else providers
        self._breaker = circuit_breaker

    def get_spot_prices(self, assets: list[str]) -> dict[str, SpotPrice]:
        remaining = list(assets)
        merged: dict[str, SpotPrice] = {}
        last_error: Exception | None = None
        for provider in self._spot_providers:
            if not remaining:
                break
            if self._breaker and not self._breaker.is_healthy(provider.name):
                logger.info("Skipping unhealthy provider %s", provider.name)
                continue
            try:
                prices = provider.get_spot_prices(remaining)
                merged.update(prices)
                remaining = [a for a in remaining if a not in merged]
            except Exception as exc:
                logger.warning("Provider %s failed spot fetch: %s", provider.name, exc)
                self._record_failure(provider.name, exc)
                last_error = exc
        if not merged and last_error is not None:
            raise PriceUnavailableError(f"All providers failed: {last_error}")
        return merged

    def get_candles(
        self,
        asset: str,
        timeframe: str,
        date_from: datetime,
        date_to: datetime,
    ) -> list[CandleData]:
        last_error: Exception | None = None
        for provider in self._candle_providers:
            if self._breaker and not self._breaker.is_healthy(provider.name):
                logger.info("Skipping unhealthy provider %s", provider.name)
                continue
            try:
                return provider.get_candles(asset, timeframe, date_from, date_to)
            except Exception as exc:
                logger.warning("Provider %s failed candle fetch: %s", provider.name, exc)
                self._record_failure(provider.name, exc)
                last_error = exc
        raise PriceUnavailableError(f"All providers failed: {last_error}")

    def _record_failure(self, name: str, exc: Exception) -> None:
        if self._breaker is None:
            return
        kind = FailureKind.QUOTA if isinstance(exc, ProviderQuotaError) else FailureKind.TRANSIENT
        self._breaker.trip(name, kind)
