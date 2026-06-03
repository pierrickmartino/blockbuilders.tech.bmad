"""Unit tests for PriceRouter: single-provider happy path and all-providers-fail."""
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock

import fakeredis
import pytest

from app.market_data.circuit_breaker import CircuitBreaker, FailureKind
from app.market_data.protocol import CandleData, PriceUnavailableError, ProviderQuotaError, SpotPrice
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


# ---------------------------------------------------------------------------
# CircuitBreaker integration
# ---------------------------------------------------------------------------


def _make_breaker() -> CircuitBreaker:
    return CircuitBreaker(fakeredis.FakeRedis())


def test_router_skips_unhealthy_provider_and_falls_through_to_next():
    good_result = {"BTC/USDT": SpotPrice(price=Decimal("50000"), change_24h_pct=0.0, volume_24h=0.0)}
    bad = _make_provider("bad")
    good = _make_provider("good", spot_result=good_result)

    breaker = _make_breaker()
    breaker.trip("bad", FailureKind.TRANSIENT)

    result = PriceRouter([bad, good], circuit_breaker=breaker).get_spot_prices(["BTC/USDT"])

    assert result == good_result
    bad.get_spot_prices.assert_not_called()


def test_router_records_transient_failure_in_breaker():
    provider = _make_provider("cryptocompare", raises=PriceUnavailableError("timeout"))
    breaker = _make_breaker()

    with pytest.raises(PriceUnavailableError):
        PriceRouter([provider], circuit_breaker=breaker).get_spot_prices(["BTC/USDT"])

    assert breaker.is_healthy("cryptocompare") is False


def test_router_records_quota_failure_with_long_cooldown():
    redis = fakeredis.FakeRedis()
    provider = _make_provider("cryptocompare", raises=ProviderQuotaError("rate limit"))
    breaker = CircuitBreaker(redis)

    with pytest.raises(PriceUnavailableError):
        PriceRouter([provider], circuit_breaker=breaker).get_spot_prices(["BTC/USDT"])

    ttl = redis.ttl("provider:cryptocompare:unhealthy")
    from app.market_data.circuit_breaker import TRANSIENT_COOLDOWN_SECONDS
    assert ttl > TRANSIENT_COOLDOWN_SECONDS


def test_router_without_breaker_behaves_as_before():
    """Backward-compat: no breaker → existing behaviour unchanged."""
    expected = {"BTC/USDT": SpotPrice(price=Decimal("50000"), change_24h_pct=0.0, volume_24h=0.0)}
    provider = _make_provider("test", spot_result=expected)

    result = PriceRouter([provider]).get_spot_prices(["BTC/USDT"])
    assert result == expected


def test_router_skips_unhealthy_for_candles():
    good_candle = CandleData(timestamp=_T0, open=1.0, high=2.0, low=0.5, close=1.5, volume=10.0)
    bad = _make_provider("bad")
    good = _make_provider("good", candle_result=[good_candle])

    breaker = _make_breaker()
    breaker.trip("bad", FailureKind.TRANSIENT)

    result = PriceRouter([bad, good], circuit_breaker=breaker).get_candles("BTC/USDT", "1h", _T0, _T1)

    assert result == [good_candle]
    bad.get_candles.assert_not_called()


# ---------------------------------------------------------------------------
# Per-asset spot routing (issue #496)
# ---------------------------------------------------------------------------


def _spot(price: str) -> SpotPrice:
    return SpotPrice(price=Decimal(price), change_24h_pct=0.0, volume_24h=0.0)


def test_router_spot_merges_partial_results_across_providers():
    """Binance prices BTC; CryptoCompare prices ETH for the remainder."""
    btc_price = _spot("50000")
    eth_price = _spot("3000")
    binance = _make_provider("binance", spot_result={"BTC/USDT": btc_price})
    cc = _make_provider("cryptocompare", spot_result={"ETH/USDT": eth_price})

    result = PriceRouter([binance, cc]).get_spot_prices(["BTC/USDT", "ETH/USDT"])

    assert result == {"BTC/USDT": btc_price, "ETH/USDT": eth_price}
    binance.get_spot_prices.assert_called_once_with(["BTC/USDT", "ETH/USDT"])
    cc.get_spot_prices.assert_called_once_with(["ETH/USDT"])


def test_router_spot_does_not_call_second_provider_when_all_priced():
    """Second provider is never called when the first prices all assets."""
    btc_price = _spot("50000")
    binance = _make_provider("binance", spot_result={"BTC/USDT": btc_price})
    cc = _make_provider("cryptocompare")

    result = PriceRouter([binance, cc]).get_spot_prices(["BTC/USDT"])

    assert result == {"BTC/USDT": btc_price}
    cc.get_spot_prices.assert_not_called()


def test_router_spot_returns_partial_when_second_provider_fails():
    """If first provider succeeds partially and second raises, return what we have."""
    btc_price = _spot("50000")
    binance = _make_provider("binance", spot_result={"BTC/USDT": btc_price})
    cc = _make_provider("cryptocompare", raises=PriceUnavailableError("quota"))

    result = PriceRouter([binance, cc]).get_spot_prices(["BTC/USDT", "ETH/USDT"])

    assert result == {"BTC/USDT": btc_price}


def test_router_spot_raises_when_all_providers_fail_with_no_prices():
    """PriceUnavailableError is raised only when every provider failed and result is empty."""
    binance = _make_provider("binance", raises=PriceUnavailableError("down"))
    cc = _make_provider("cryptocompare", raises=PriceUnavailableError("quota"))

    with pytest.raises(PriceUnavailableError):
        PriceRouter([binance, cc]).get_spot_prices(["BTC/USDT"])


# ---------------------------------------------------------------------------
# Per-surface primaries (ADR-0003): spot Binance-first, candles CC-first
# ---------------------------------------------------------------------------


def test_router_spot_uses_binance_first_candles_use_cryptocompare_first():
    """One router, opposite primaries per surface (ADR-0003).

    Spot must hit Binance before CryptoCompare so refresh_spot_prices()
    stops spending CryptoCompare quota; candles must hit CryptoCompare
    first for its broader history.
    """
    btc_spot = _spot("50000")
    cc_candle = CandleData(timestamp=_T0, open=1.0, high=2.0, low=0.5, close=1.5, volume=10.0)
    binance = _make_provider("binance", spot_result={"BTC/USDT": btc_spot})
    cc = _make_provider("cryptocompare", candle_result=[cc_candle])

    router = PriceRouter(
        [cc, binance],
        spot_order=[binance, cc],
        candle_order=[cc, binance],
    )

    spot = router.get_spot_prices(["BTC/USDT"])
    candles = router.get_candles("BTC/USDT", "1h", _T0, _T1)

    # Spot: Binance prices everything, CryptoCompare is never touched.
    assert spot == {"BTC/USDT": btc_spot}
    binance.get_spot_prices.assert_called_once_with(["BTC/USDT"])
    cc.get_spot_prices.assert_not_called()

    # Candles: CryptoCompare answers first, Binance is never touched.
    assert candles == [cc_candle]
    cc.get_candles.assert_called_once_with("BTC/USDT", "1h", _T0, _T1)
    binance.get_candles.assert_not_called()


def test_router_spot_unhealthy_primary_routes_all_to_backup():
    """Tripped Binance → all assets go to CryptoCompare without calling Binance."""
    cc_result = {"BTC/USDT": _spot("50000"), "ETH/USDT": _spot("3000")}
    binance = _make_provider("binance")
    cc = _make_provider("cryptocompare", spot_result=cc_result)

    breaker = _make_breaker()
    breaker.trip("binance", FailureKind.TRANSIENT)

    result = PriceRouter([binance, cc], circuit_breaker=breaker).get_spot_prices(["BTC/USDT", "ETH/USDT"])

    assert result == cc_result
    binance.get_spot_prices.assert_not_called()
