"""Binance implementation of PriceProvider (keyless, public API)."""
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal

import httpx
from redis import Redis

from app.market_data.protocol import CandleData, PriceUnavailableError, SpotPrice

logger = logging.getLogger(__name__)

_BINANCE_BASE_URL = "https://api.binance.com"

_TIMEFRAME_MAP = {
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
}


class SymbolMapper:
    """Maps BASE/QUOTE assets to Binance symbols; filters against daily-cached exchangeInfo."""

    _CACHE_KEY = "binance:exchange_info"
    _CACHE_TTL = 86400  # 1 day in seconds

    def __init__(self, redis_client: Redis) -> None:
        self._redis = redis_client

    def to_binance_symbol(self, asset: str) -> str:
        return asset.replace("/", "")

    def get_supported_symbols(self) -> set[str]:
        cached = self._redis.get(self._CACHE_KEY)
        if cached:
            return set(json.loads(cached))

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(f"{_BINANCE_BASE_URL}/api/v3/exchangeInfo")
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as exc:
            raise PriceUnavailableError(f"Binance exchangeInfo fetch failed: {exc}") from exc

        symbols = {s["symbol"] for s in data.get("symbols", [])}
        self._redis.set(self._CACHE_KEY, json.dumps(list(symbols)), ex=self._CACHE_TTL)
        return symbols

    def is_supported(self, asset: str) -> bool:
        return self.to_binance_symbol(asset) in self.get_supported_symbols()

    def partition(self, assets: list[str]) -> tuple[list[str], list[str]]:
        """Return (supported, unsupported) based on exchangeInfo."""
        supported_symbols = self.get_supported_symbols()
        supported = [a for a in assets if self.to_binance_symbol(a) in supported_symbols]
        unsupported = [a for a in assets if self.to_binance_symbol(a) not in supported_symbols]
        return supported, unsupported


class BinanceProvider:
    """Fetches spot prices and candles from Binance public API."""

    name = "binance"

    def __init__(self, symbol_mapper: SymbolMapper) -> None:
        self._mapper = symbol_mapper

    # ------------------------------------------------------------------ #
    # Spot prices                                                          #
    # ------------------------------------------------------------------ #

    def get_spot_prices(self, assets: list[str]) -> dict[str, SpotPrice]:
        supported, _ = self._mapper.partition(assets)
        if not supported:
            return {}

        symbols = [self._mapper.to_binance_symbol(a) for a in supported]

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(
                    f"{_BINANCE_BASE_URL}/api/v3/ticker/24hr",
                    params={"symbols": json.dumps(symbols)},
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as exc:
            raise PriceUnavailableError(f"Binance HTTP error: {exc}") from exc

        ticker_by_symbol = {t["symbol"]: t for t in data}
        result: dict[str, SpotPrice] = {}
        for asset in supported:
            symbol = self._mapper.to_binance_symbol(asset)
            ticker = ticker_by_symbol.get(symbol)
            if ticker:
                result[asset] = SpotPrice(
                    price=Decimal(ticker["lastPrice"]),
                    change_24h_pct=float(ticker["priceChangePercent"]),
                    volume_24h=float(ticker["quoteVolume"]),
                )
            else:
                logger.warning("No ticker data for %s from Binance", asset)
        return result

    # ------------------------------------------------------------------ #
    # Candles                                                              #
    # ------------------------------------------------------------------ #

    def get_candles(
        self,
        asset: str,
        timeframe: str,
        date_from: datetime,
        date_to: datetime,
    ) -> list[CandleData]:
        if not self._mapper.is_supported(asset):
            raise PriceUnavailableError(f"Binance does not support asset: {asset}")

        interval = _TIMEFRAME_MAP.get(timeframe)
        if interval is None:
            raise PriceUnavailableError(f"Unsupported timeframe for Binance: {timeframe}")

        symbol = self._mapper.to_binance_symbol(asset)
        start_ms = int(date_from.timestamp() * 1000)
        end_ms = int(date_to.timestamp() * 1000)

        candles: list[CandleData] = []
        current_start = start_ms

        try:
            with httpx.Client(timeout=30.0) as client:
                while current_start < end_ms:
                    response = client.get(
                        f"{_BINANCE_BASE_URL}/api/v3/klines",
                        params={
                            "symbol": symbol,
                            "interval": interval,
                            "startTime": current_start,
                            "endTime": end_ms,
                            "limit": 1000,
                        },
                    )
                    response.raise_for_status()
                    data = response.json()

                    if not data:
                        break

                    for row in data:
                        ts = datetime.fromtimestamp(row[0] / 1000, tz=timezone.utc)
                        candles.append(CandleData(
                            timestamp=ts,
                            open=float(row[1]),
                            high=float(row[2]),
                            low=float(row[3]),
                            close=float(row[4]),
                            volume=float(row[5]),
                        ))

                    if len(data) < 1000:
                        break

                    # Advance past the last returned candle's open time
                    current_start = data[-1][0] + 1

        except httpx.HTTPError as exc:
            raise PriceUnavailableError(f"Binance HTTP error: {exc}") from exc

        return candles
