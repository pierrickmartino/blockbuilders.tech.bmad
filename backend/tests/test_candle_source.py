"""Tests for candle source tagging (issue #497): provider tagging, DB persistence,
and used_backup_data flag propagation."""
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import fakeredis
import pytest

from app.market_data.circuit_breaker import CircuitBreaker, FailureKind
from app.market_data.protocol import CandleData, ProviderQuotaError
from app.market_data.router import PriceRouter
from app.models.candle import Candle

_T0 = datetime(2024, 1, 1, tzinfo=timezone.utc)
_T1 = datetime(2024, 1, 2, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Slice 1: CandleData has a source field
# ---------------------------------------------------------------------------


def test_candle_data_defaults_source_to_cryptocompare():
    candle = CandleData(timestamp=_T0, open=1.0, high=2.0, low=0.5, close=1.5, volume=10.0)
    assert candle.source == "cryptocompare"


def test_candle_data_accepts_explicit_source():
    candle = CandleData(timestamp=_T0, open=1.0, high=2.0, low=0.5, close=1.5, volume=10.0, source="binance")
    assert candle.source == "binance"


# ---------------------------------------------------------------------------
# Slice 2: Router candle ordering — CryptoCompare primary, Binance backup
# ---------------------------------------------------------------------------


def _make_provider(name: str, candle_result=None, raises=None):
    provider = MagicMock()
    provider.name = name
    if raises is not None:
        provider.get_candles.side_effect = raises
    else:
        provider.get_candles.return_value = candle_result if candle_result is not None else []
    return provider


def _cc_candle():
    return CandleData(timestamp=_T0, open=1.0, high=2.0, low=0.5, close=1.5, volume=10.0, source="cryptocompare")


def _binance_candle():
    return CandleData(timestamp=_T0, open=1.0, high=2.0, low=0.5, close=1.5, volume=10.0, source="binance")


def test_router_candles_prefers_cryptocompare_over_binance():
    """When CC succeeds, Binance is never called."""
    cc = _make_provider("cryptocompare", candle_result=[_cc_candle()])
    binance = _make_provider("binance", candle_result=[_binance_candle()])

    result = PriceRouter([cc, binance]).get_candles("BTC/USDT", "1h", _T0, _T1)

    assert result[0].source == "cryptocompare"
    binance.get_candles.assert_not_called()


def test_router_candles_falls_back_to_binance_when_cc_capped():
    """When CC raises ProviderQuotaError, Binance is used."""
    cc = _make_provider("cryptocompare", raises=ProviderQuotaError("rate limit"))
    binance = _make_provider("binance", candle_result=[_binance_candle()])

    result = PriceRouter([cc, binance]).get_candles("BTC/USDT", "1h", _T0, _T1)

    assert result[0].source == "binance"
    binance.get_candles.assert_called_once()


def test_router_candles_skips_unhealthy_cc_and_uses_binance():
    """When CC is circuit-tripped, router goes directly to Binance."""
    cc = _make_provider("cryptocompare")
    binance = _make_provider("binance", candle_result=[_binance_candle()])

    breaker = CircuitBreaker(fakeredis.FakeRedis())
    breaker.trip("cryptocompare", FailureKind.QUOTA)

    result = PriceRouter([cc, binance], circuit_breaker=breaker).get_candles("BTC/USDT", "1h", _T0, _T1)

    assert result[0].source == "binance"
    cc.get_candles.assert_not_called()


# ---------------------------------------------------------------------------
# Slice 3: Candle model has source column
# ---------------------------------------------------------------------------


def test_candle_model_has_source_column():
    candle = Candle(
        asset="BTC/USDT",
        timeframe="1d",
        timestamp=_T0,
        open=1.0,
        high=2.0,
        low=0.5,
        close=1.5,
        volume=10.0,
        source="binance",
    )
    assert candle.source == "binance"


def test_candle_model_source_defaults_to_cryptocompare():
    candle = Candle(
        asset="BTC/USDT",
        timeframe="1d",
        timestamp=_T0,
        open=1.0,
        high=2.0,
        low=0.5,
        close=1.5,
        volume=10.0,
    )
    assert candle.source == "cryptocompare"


# ---------------------------------------------------------------------------
# Slice 4: fetch_candles stores source from CandleData
# ---------------------------------------------------------------------------


def test_fetch_candles_stores_binance_source(session, monkeypatch):
    """Candles sourced from Binance are persisted with source='binance'."""
    from app.backtest.candles import fetch_candles
    from app.market_data import price_router

    ts = datetime(2025, 1, 1, tzinfo=timezone.utc)
    monkeypatch.setattr(
        price_router,
        "get_candles",
        lambda *_a, **_kw: [
            CandleData(timestamp=ts, open=1.0, high=2.0, low=0.5, close=1.5, volume=10.0, source="binance")
        ],
    )

    candles = fetch_candles(
        asset="ETH/USDT",
        timeframe="1d",
        date_from=ts,
        date_to=ts,
        session=session,
    )

    assert len(candles) == 1
    assert candles[0].source == "binance"


def test_fetch_candles_stores_cryptocompare_source_by_default(session, monkeypatch):
    """Candles from CC are persisted with source='cryptocompare'."""
    from app.backtest.candles import fetch_candles
    from app.market_data import price_router

    ts = datetime(2025, 2, 1, tzinfo=timezone.utc)
    monkeypatch.setattr(
        price_router,
        "get_candles",
        lambda *_a, **_kw: [
            CandleData(timestamp=ts, open=2.0, high=3.0, low=1.5, close=2.5, volume=20.0)
        ],
    )

    candles = fetch_candles(
        asset="BNB/USDT",
        timeframe="1d",
        date_from=ts,
        date_to=ts,
        session=session,
    )

    assert len(candles) == 1
    assert candles[0].source == "cryptocompare"


# ---------------------------------------------------------------------------
# Slice 5: BacktestRun has used_backup_data flag
# ---------------------------------------------------------------------------


def test_backtest_run_has_used_backup_data_flag():
    from app.models.backtest_run import BacktestRun

    run = BacktestRun(
        user_id="00000000-0000-0000-0000-000000000001",
        strategy_id="00000000-0000-0000-0000-000000000002",
        strategy_version_id="00000000-0000-0000-0000-000000000003",
        date_from=_T0,
        date_to=_T1,
    )
    assert run.used_backup_data is False


def test_backtest_run_used_backup_data_can_be_set():
    from app.models.backtest_run import BacktestRun

    run = BacktestRun(
        user_id="00000000-0000-0000-0000-000000000001",
        strategy_id="00000000-0000-0000-0000-000000000002",
        strategy_version_id="00000000-0000-0000-0000-000000000003",
        date_from=_T0,
        date_to=_T1,
        used_backup_data=True,
    )
    assert run.used_backup_data is True
