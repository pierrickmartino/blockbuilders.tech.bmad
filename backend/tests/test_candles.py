from datetime import datetime, timezone

from sqlmodel import select

from app.backtest.candles import fetch_candles
from app.models.candle import Candle


def test_fetch_candles_uses_cache_when_complete(session, monkeypatch):
    ts = datetime(2025, 1, 1, tzinfo=timezone.utc)
    session.add(
        Candle(
            asset="BTC/USDT",
            timeframe="1d",
            timestamp=ts,
            open=100.0,
            high=101.0,
            low=99.0,
            close=100.0,
            volume=1000.0,
        )
    )
    session.commit()

    called = False

    def fake_vendor(*args, **kwargs):
        nonlocal called
        called = True
        return []

    monkeypatch.setattr("app.backtest.candles._fetch_from_vendor", fake_vendor)

    candles = fetch_candles(
        asset="BTC/USDT",
        timeframe="1d",
        date_from=ts,
        date_to=ts,
        session=session,
        force_refresh=False,
    )

    assert len(candles) == 1
    assert candles[0].close == 100.0
    assert called is False


def test_fetch_candles_force_refresh_overwrites_existing(session, monkeypatch):
    ts = datetime(2025, 1, 1, tzinfo=timezone.utc)
    session.add(
        Candle(
            asset="BTC/USDT",
            timeframe="1d",
            timestamp=ts,
            open=100.0,
            high=101.0,
            low=99.0,
            close=100.0,
            volume=1000.0,
        )
    )
    session.commit()

    monkeypatch.setattr(
        "app.backtest.candles._fetch_from_vendor",
        lambda *_args, **_kwargs: [
            {
                "timestamp": ts,
                "open": 110.0,
                "high": 112.0,
                "low": 109.0,
                "close": 111.0,
                "volume": 1500.0,
            }
        ],
    )

    candles = fetch_candles(
        asset="BTC/USDT",
        timeframe="1d",
        date_from=ts,
        date_to=ts,
        session=session,
        force_refresh=True,
    )

    assert len(candles) == 1
    assert candles[0].open == 110.0
    assert candles[0].close == 111.0
    assert candles[0].volume == 1500.0

    stored = session.exec(
        select(Candle).where(
            Candle.asset == "BTC/USDT",
            Candle.timeframe == "1d",
            Candle.timestamp == ts,
        )
    ).first()
    assert stored is not None
    assert stored.open == 110.0
    assert stored.close == 111.0
    assert stored.volume == 1500.0
