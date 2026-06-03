"""Unit tests for BinanceProvider and SymbolMapper (issue #494)."""
import json
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch

import fakeredis
import httpx
import pytest

from app.market_data.binance import BinanceProvider, SymbolMapper
from app.market_data.protocol import PriceUnavailableError, SpotPrice

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_STUB_SYMBOLS = {"BTCUSDT", "ETHUSDT", "SOLUSDT"}

_T0 = datetime(2024, 1, 1, tzinfo=timezone.utc)
_T1 = datetime(2024, 1, 2, tzinfo=timezone.utc)


def _mapper_with_stub_cache(symbols: set[str] = _STUB_SYMBOLS) -> SymbolMapper:
    redis = fakeredis.FakeRedis()
    redis.set("binance:exchange_info", json.dumps(list(symbols)))
    return SymbolMapper(redis)


def _make_provider(symbols: set[str] = _STUB_SYMBOLS) -> BinanceProvider:
    return BinanceProvider(_mapper_with_stub_cache(symbols))


def _mock_client(response_data) -> MagicMock:
    mock_response = MagicMock()
    mock_response.json.return_value = response_data
    mock_response.raise_for_status = MagicMock()

    client = MagicMock()
    client.__enter__ = MagicMock(return_value=client)
    client.__exit__ = MagicMock(return_value=False)
    client.get.return_value = mock_response
    return client


# ---------------------------------------------------------------------------
# SymbolMapper – symbol derivation
# ---------------------------------------------------------------------------


def test_symbol_mapper_derives_btc_usdt():
    mapper = _mapper_with_stub_cache()
    assert mapper.to_binance_symbol("BTC/USDT") == "BTCUSDT"


def test_symbol_mapper_derives_sol_usdt():
    mapper = _mapper_with_stub_cache()
    assert mapper.to_binance_symbol("SOL/USDT") == "SOLUSDT"


# ---------------------------------------------------------------------------
# SymbolMapper – support filtering
# ---------------------------------------------------------------------------


def test_symbol_mapper_is_supported_true():
    mapper = _mapper_with_stub_cache()
    assert mapper.is_supported("BTC/USDT") is True


def test_symbol_mapper_is_supported_false():
    mapper = _mapper_with_stub_cache()
    assert mapper.is_supported("DOGE/USDT") is False


def test_symbol_mapper_partition_splits_correctly():
    mapper = _mapper_with_stub_cache()
    supported, unsupported = mapper.partition(["BTC/USDT", "DOGE/USDT", "ETH/USDT"])
    assert sorted(supported) == ["BTC/USDT", "ETH/USDT"]
    assert unsupported == ["DOGE/USDT"]


# ---------------------------------------------------------------------------
# SymbolMapper – daily cache reuse
# ---------------------------------------------------------------------------


def test_symbol_mapper_fetches_exchange_info_only_once():
    """exchangeInfo HTTP call made once; subsequent calls use Redis cache."""
    redis = fakeredis.FakeRedis()
    mapper = SymbolMapper(redis)

    exchange_info = {"symbols": [{"symbol": "BTCUSDT"}, {"symbol": "ETHUSDT"}]}
    mock_client = _mock_client(exchange_info)

    with patch("app.market_data.binance.httpx.Client", return_value=mock_client):
        first = mapper.get_supported_symbols()
        second = mapper.get_supported_symbols()

    assert first == {"BTCUSDT", "ETHUSDT"}
    assert second == {"BTCUSDT", "ETHUSDT"}
    assert mock_client.get.call_count == 1


def test_symbol_mapper_unsupported_assets_can_be_identified_for_routing():
    """Partition clearly separates assets that must fall back to CryptoCompare."""
    mapper = _mapper_with_stub_cache({"BTCUSDT"})
    _, unsupported = mapper.partition(["BTC/USDT", "XMR/USDT"])
    assert unsupported == ["XMR/USDT"]


# ---------------------------------------------------------------------------
# BinanceProvider – spot prices
# ---------------------------------------------------------------------------


def test_binance_provider_get_spot_prices_returns_spot_price():
    provider = _make_provider()
    ticker_data = [
        {
            "symbol": "BTCUSDT",
            "lastPrice": "50000.00",
            "priceChangePercent": "1.5",
            "quoteVolume": "1000000.0",
        }
    ]
    with patch("app.market_data.binance.httpx.Client", return_value=_mock_client(ticker_data)):
        result = provider.get_spot_prices(["BTC/USDT"])

    spot = result["BTC/USDT"]
    assert spot.price == Decimal("50000.00")
    assert spot.change_24h_pct == 1.5
    assert spot.volume_24h == 1_000_000.0


def test_binance_provider_skips_unsupported_assets():
    provider = _make_provider()
    with patch("app.market_data.binance.httpx.Client", return_value=_mock_client([])):
        result = provider.get_spot_prices(["DOGE/USDT"])
    assert "DOGE/USDT" not in result


def test_binance_provider_returns_empty_for_all_unsupported():
    provider = _make_provider()
    with patch("app.market_data.binance.httpx.Client", return_value=_mock_client([])):
        result = provider.get_spot_prices(["DOGE/USDT", "XMR/USDT"])
    assert result == {}


def test_binance_provider_spot_sends_compact_symbols_without_spaces():
    """Regression: Binance rejects whitespace in the `symbols` array with HTTP 400
    (error -1100, "Illegal characters"). The request must serialize symbols as
    compact JSON, e.g. ["BTCUSDT","ETHUSDT"] and never ["BTCUSDT", "ETHUSDT"]."""
    provider = _make_provider()
    ticker_data = [
        {"symbol": "BTCUSDT", "lastPrice": "50000.00", "priceChangePercent": "1.5", "quoteVolume": "1000000.0"},
        {"symbol": "ETHUSDT", "lastPrice": "3000.00", "priceChangePercent": "1.2", "quoteVolume": "500000.0"},
    ]

    mock_client = _mock_client(ticker_data)
    with patch("app.market_data.binance.httpx.Client", return_value=mock_client):
        provider.get_spot_prices(["BTC/USDT", "ETH/USDT"])

    sent_symbols = mock_client.get.call_args.kwargs["params"]["symbols"]
    assert " " not in sent_symbols
    assert sent_symbols == '["BTCUSDT","ETHUSDT"]'


# ---------------------------------------------------------------------------
# BinanceProvider – candles
# ---------------------------------------------------------------------------


def _kline_row(open_time_ms: int, o, h, l, c, v):
    return [open_time_ms, str(o), str(h), str(l), str(c), str(v),
            open_time_ms + 3600000, "0", 0, "0", "0", "0"]


def test_binance_provider_get_candles_1h_returns_candle_data():
    provider = _make_provider()
    open_time_ms = int(_T0.timestamp() * 1000)
    klines = [_kline_row(open_time_ms, 50000, 51000, 49000, 50500, 100.0)]

    with patch("app.market_data.binance.httpx.Client", return_value=_mock_client(klines)):
        candles = provider.get_candles("BTC/USDT", "1h", _T0, _T1)

    assert len(candles) == 1
    c = candles[0]
    assert c.timestamp == _T0
    assert c.open == 50000.0
    assert c.high == 51000.0
    assert c.low == 49000.0
    assert c.close == 50500.0
    assert c.volume == 100.0


def test_binance_provider_candles_use_native_4h_interval():
    """Provider sends interval=4h to Binance — no manual aggregation like CryptoCompare."""
    provider = _make_provider()
    open_time_ms = int(_T0.timestamp() * 1000)
    klines = [_kline_row(open_time_ms, 50000, 52000, 49000, 51000, 400.0)]

    mock_client = _mock_client(klines)
    with patch("app.market_data.binance.httpx.Client", return_value=mock_client):
        candles = provider.get_candles("BTC/USDT", "4h", _T0, _T1)

    sent_params = mock_client.get.call_args.kwargs["params"]
    assert sent_params["interval"] == "4h"
    assert len(candles) == 1


def test_binance_provider_candles_use_native_1d_interval():
    provider = _make_provider()
    open_time_ms = int(_T0.timestamp() * 1000)
    klines = [_kline_row(open_time_ms, 50000, 52000, 49000, 51000, 400.0)]

    mock_client = _mock_client(klines)
    with patch("app.market_data.binance.httpx.Client", return_value=mock_client):
        provider.get_candles("BTC/USDT", "1d", _T0, _T1)

    sent_params = mock_client.get.call_args.kwargs["params"]
    assert sent_params["interval"] == "1d"


def test_binance_provider_candles_raises_for_unsupported_asset():
    provider = _make_provider()
    with pytest.raises(PriceUnavailableError, match="does not support"):
        provider.get_candles("DOGE/USDT", "1h", _T0, _T1)


# ---------------------------------------------------------------------------
# BinanceProvider – error handling
# ---------------------------------------------------------------------------


def test_binance_provider_spot_raises_on_http_error():
    provider = _make_provider()
    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.get.side_effect = httpx.HTTPError("network failure")

    with patch("app.market_data.binance.httpx.Client", return_value=mock_client):
        with pytest.raises(PriceUnavailableError):
            provider.get_spot_prices(["BTC/USDT"])


def test_binance_provider_candles_raises_on_http_error():
    provider = _make_provider()
    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.get.side_effect = httpx.HTTPError("network failure")

    with patch("app.market_data.binance.httpx.Client", return_value=mock_client):
        with pytest.raises(PriceUnavailableError):
            provider.get_candles("BTC/USDT", "1h", _T0, _T1)
