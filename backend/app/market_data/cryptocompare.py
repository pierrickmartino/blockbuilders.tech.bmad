"""CryptoCompare implementation of PriceProvider."""
import logging
from datetime import datetime, timezone
from decimal import Decimal

import httpx

from app.core.config import settings
from app.market_data.protocol import CandleData, PriceUnavailableError, ProviderQuotaError, SpotPrice

logger = logging.getLogger(__name__)

# Timeframe → seconds; mirrors candles.py constant so both stay in sync.
_TIMEFRAME_SECONDS = {
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
}


class CryptoCompareProvider:
    """Fetches spot prices and candles from the CryptoCompare API."""

    name = "cryptocompare"

    # ------------------------------------------------------------------ #
    # Spot prices                                                          #
    # ------------------------------------------------------------------ #

    def get_spot_prices(self, assets: list[str]) -> dict[str, SpotPrice]:
        fsyms = [a.split("/")[0] for a in assets]
        fsyms_str = ",".join(fsyms)

        try:
            with httpx.Client(timeout=10.0) as client:
                url = f"{settings.cryptocompare_api_url}/pricemultifull"
                params: dict = {"fsyms": fsyms_str, "tsyms": "USDT"}
                if settings.cryptocompare_api_key:
                    params["api_key"] = settings.cryptocompare_api_key

                response = client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as exc:
            raise PriceUnavailableError(f"CryptoCompare HTTP error: {exc}") from exc

        if data.get("Response") == "Error":
            _raise_for_message(data.get("Message", ""))

        raw_data = data.get("RAW", {})
        result: dict[str, SpotPrice] = {}
        for asset in assets:
            base = asset.split("/")[0]
            ticker = raw_data.get(base, {}).get("USDT")
            if ticker:
                result[asset] = SpotPrice(
                    price=Decimal(str(ticker.get("PRICE", 0.0))),
                    change_24h_pct=float(ticker.get("CHANGEPCT24HOUR", 0.0)),
                    volume_24h=float(ticker.get("VOLUME24HOURTO", 0.0)),
                )
            else:
                # Omit missing assets — never emit a zero placeholder. A zero
                # SpotPrice is truthy, so it would satisfy the router's
                # "remaining" filter and silently block fallback providers,
                # and it would poison the spot cache with a fake price.
                logger.warning("No ticker data for %s", asset)
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
        parts = asset.split("/")
        if len(parts) != 2:
            raise PriceUnavailableError(f"Invalid asset format: {asset}")
        fsym, tsym = parts

        endpoint = "histohour" if timeframe in ("1h", "4h") else "histoday"
        interval_seconds = _TIMEFRAME_SECONDS.get(timeframe, 3600)
        total_candles = int((date_to.timestamp() - date_from.timestamp()) / interval_seconds) + 1

        raw: list[CandleData] = []
        current_to_ts = int(date_to.timestamp())
        remaining = total_candles

        try:
            with httpx.Client(timeout=30.0) as client:
                while remaining > 0:
                    limit = min(remaining, 2000)
                    url = f"{settings.cryptocompare_api_url}/v2/{endpoint}"
                    params: dict = {
                        "fsym": fsym,
                        "tsym": tsym,
                        "limit": limit,
                        "toTs": current_to_ts,
                    }
                    if settings.cryptocompare_api_key:
                        params["api_key"] = settings.cryptocompare_api_key

                    response = client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()

                    if data.get("Response") == "Error":
                        _raise_for_message(data.get("Message", "Unknown vendor error"))

                    candles_data = data.get("Data", {}).get("Data", [])
                    if not candles_data:
                        break

                    for c in candles_data:
                        ts = datetime.fromtimestamp(c["time"], tz=timezone.utc)
                        if date_from <= ts <= date_to:
                            raw.append(CandleData(
                                timestamp=ts,
                                open=float(c["open"]),
                                high=float(c["high"]),
                                low=float(c["low"]),
                                close=float(c["close"]),
                                volume=float(c.get("volumefrom", 0)),
                            ))

                    earliest_ts = min(c["time"] for c in candles_data)
                    if earliest_ts >= current_to_ts:
                        break
                    current_to_ts = earliest_ts - 1
                    remaining -= len(candles_data)

        except httpx.HTTPError as exc:
            raise PriceUnavailableError(f"CryptoCompare HTTP error: {exc}") from exc

        raw.sort(key=lambda c: c.timestamp)

        if timeframe == "4h" and raw:
            raw = _aggregate_to_4h(raw)

        return raw


# ------------------------------------------------------------------ #
# Error classification                                                 #
# ------------------------------------------------------------------ #

_QUOTA_KEYWORDS = ("rate limit", "over your", "upgrade your account", "quota")


def _raise_for_message(message: str) -> None:
    lower = message.lower()
    if any(kw in lower for kw in _QUOTA_KEYWORDS):
        raise ProviderQuotaError(f"CryptoCompare quota error: {message}")
    raise PriceUnavailableError(f"CryptoCompare API error: {message}")


# ------------------------------------------------------------------ #
# 4-hour aggregation helpers (moved from candles.py)                  #
# ------------------------------------------------------------------ #

def _aggregate_to_4h(hourly: list[CandleData]) -> list[CandleData]:
    aggregated: list[CandleData] = []
    group: list[CandleData] = []

    for candle in hourly:
        if candle.timestamp.hour % 4 == 0 and group:
            aggregated.append(_merge(group))
            group = []
        group.append(candle)

    if group:
        aggregated.append(_merge(group))

    return aggregated


def _merge(candles: list[CandleData]) -> CandleData:
    return CandleData(
        timestamp=candles[0].timestamp,
        open=candles[0].open,
        high=max(c.high for c in candles),
        low=min(c.low for c in candles),
        close=candles[-1].close,
        volume=sum(c.volume for c in candles),
    )
