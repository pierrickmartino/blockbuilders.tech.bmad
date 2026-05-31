"""Unit tests for CryptoCompareProvider spot-price behavior."""
from decimal import Decimal
from unittest.mock import MagicMock, patch

from app.market_data.cryptocompare import CryptoCompareProvider


def _mock_client(response_data) -> MagicMock:
    mock_response = MagicMock()
    mock_response.json.return_value = response_data
    mock_response.raise_for_status = MagicMock()

    client = MagicMock()
    client.__enter__ = MagicMock(return_value=client)
    client.__exit__ = MagicMock(return_value=False)
    client.get.return_value = mock_response
    return client


def test_get_spot_prices_returns_price_for_present_asset():
    provider = CryptoCompareProvider()
    data = {"RAW": {"BTC": {"USDT": {"PRICE": 50000.0, "CHANGEPCT24HOUR": 1.5, "VOLUME24HOURTO": 100.0}}}}

    with patch("app.market_data.cryptocompare.httpx.Client", return_value=_mock_client(data)):
        result = provider.get_spot_prices(["BTC/USDT"])

    assert result["BTC/USDT"].price == Decimal("50000.0")


def test_get_spot_prices_omits_missing_asset_no_zero_placeholder():
    """Regression: a missing asset must be omitted, never returned as a zero
    placeholder. A zero SpotPrice is truthy and would satisfy the router's
    'remaining' filter, silently blocking fallback providers and poisoning the
    spot cache with a fake price."""
    provider = CryptoCompareProvider()
    # RAW present for BTC only; ETH absent.
    data = {"RAW": {"BTC": {"USDT": {"PRICE": 50000.0, "CHANGEPCT24HOUR": 1.5, "VOLUME24HOURTO": 100.0}}}}

    with patch("app.market_data.cryptocompare.httpx.Client", return_value=_mock_client(data)):
        result = provider.get_spot_prices(["BTC/USDT", "ETH/USDT"])

    assert "BTC/USDT" in result
    assert "ETH/USDT" not in result


def test_get_spot_prices_returns_empty_when_all_missing():
    provider = CryptoCompareProvider()
    data = {"RAW": {}}

    with patch("app.market_data.cryptocompare.httpx.Client", return_value=_mock_client(data)):
        result = provider.get_spot_prices(["BTC/USDT", "ETH/USDT"])

    assert result == {}
