"""Unit tests for PriceRouter: single-provider happy path and all-providers-fail."""
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.market_data.protocol import CandleData, PriceUnavailableError, SpotPrice
from app.market_data.router import PriceRouter


def _make_provider(name: str, spot_result=None, candle_result=None, raises=None):
    provider = MagicMock()
    provider.name = name
    if raises is not None:
        provider.get_spot_prices.side_effect = raises
        provider.get_candles.side_effect = raises
    else:
        provider.get_spot_prices.return_value = spot_result if spot_result is not None else {}
        provider.get_candles.return_value = candle_result if candle_result is not None else []
    return provider


_T0 = datetime(2024, 1, 1, tzinfo=timezone.utc)
_T1 = datetime(2024, 1, 2, tzinfo=timezone.utc)


def test_router_get_spot_prices_delegates_to_provider():
    expected = {"BTC/USDT": SpotPrice(price=Decimal("50000"), change_24h_pct=1.5, volume_24h=1_000_000.0)}
    provider = _make_provider("test", spot_result=expected)

    result = PriceRouter([provider]).get_spot_prices(["BTC/USDT"])

    assert result == expected
    provider.get_spot_prices.assert_called_once_with(["BTC/USDT"])


def test_router_get_candles_delegates_to_provider():
    candle = CandleData(timestamp=_T0, open=50000.0, high=51000.0, low=49000.0, close=50500.0, volume=100.0)
    provider = _make_provider("test", candle_result=[candle])

    result = PriceRouter([provider]).get_candles("BTC/USDT", "1h", _T0, _T1)

    assert result == [candle]
    provider.get_candles.assert_called_once_with("BTC/USDT", "1h", _T0, _T1)


def test_router_raises_when_all_providers_fail_spot():
    provider = _make_provider("bad", raises=Exception("API down"))

    with pytest.raises(PriceUnavailableError):
        PriceRouter([provider]).get_spot_prices(["BTC/USDT"])


def test_router_raises_when_all_providers_fail_candles():
    provider = _make_provider("bad", raises=Exception("API down"))

    with pytest.raises(PriceUnavailableError):
        PriceRouter([provider]).get_candles("BTC/USDT", "1h", _T0, _T1)
