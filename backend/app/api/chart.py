"""Market chart inspection endpoint (FEAT-100)."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.backtest import indicators as ind
from app.core.database import get_session
from app.models.candle import Candle
from app.models.user import User
from app.schemas.market import (
    ChartCandle,
    ChartDataResponse,
    ChartDataStatus,
    IndicatorPoint,
    IndicatorSeries,
)
from app.schemas.strategy import ALLOWED_ASSETS, ALLOWED_TIMEFRAMES

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_INDICATORS = 8

_OSCILLATOR_KEYS = {"rsi", "atr", "macd", "stochastic", "adx", "obv"}

_SUPPORTED_KEYS = {
    "sma", "ema", "rsi", "atr", "macd", "bollinger",
    "stochastic", "adx", "ichimoku", "obv", "fib",
}


@dataclass(frozen=True)
class IndicatorRequest:
    key: str
    period: Optional[int]


def _parse_indicators(raw: Optional[str]) -> list[IndicatorRequest]:
    """Parse `ema:20,rsi:14` into structured requests. Period optional for some keys."""
    if not raw:
        return []
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    if len(parts) > MAX_INDICATORS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Too many indicators (max {MAX_INDICATORS})",
        )
    out: list[IndicatorRequest] = []
    for token in parts:
        key, _, period_str = token.partition(":")
        key = key.lower()
        if key not in _SUPPORTED_KEYS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported indicator '{key}'",
            )
        period: Optional[int] = None
        if period_str:
            try:
                period = int(period_str)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid period for indicator '{key}'",
                )
            if period < 1 or period > 500:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Period out of range for indicator '{key}'",
                )
        out.append(IndicatorRequest(key=key, period=period))
    return out


def _series(
    key: str,
    label: str,
    parameters: dict,
    pane: str,
    timestamps: list[datetime],
    values: list[Optional[float]],
) -> IndicatorSeries:
    points = [IndicatorPoint(timestamp=t, value=v) for t, v in zip(timestamps, values)]
    return IndicatorSeries(
        key=key, label=label, parameters=parameters, pane=pane, points=points
    )


def _compute_series(
    req: IndicatorRequest,
    timestamps: list[datetime],
    highs: list[float],
    lows: list[float],
    closes: list[float],
    volumes: list[float],
) -> list[IndicatorSeries]:
    """Compute one or more output series for a single indicator request."""
    key = req.key

    if key == "sma":
        period = req.period or 20
        return [_series("sma", f"SMA({period})", {"period": period}, "price",
                        timestamps, ind.sma(closes, period))]

    if key == "ema":
        period = req.period or 20
        return [_series("ema", f"EMA({period})", {"period": period}, "price",
                        timestamps, ind.ema(closes, period))]

    if key == "rsi":
        period = req.period or 14
        return [_series("rsi", f"RSI({period})", {"period": period}, "oscillator",
                        timestamps, ind.rsi(closes, period))]

    if key == "atr":
        period = req.period or 14
        return [_series("atr", f"ATR({period})", {"period": period}, "oscillator",
                        timestamps, ind.atr(highs, lows, closes, period))]

    if key == "macd":
        macd_line, signal_line, hist = ind.macd(closes)
        params = {"fast": 12, "slow": 26, "signal": 9}
        return [
            _series("macd", "MACD(12,26,9)", params, "oscillator", timestamps, macd_line),
            _series("macd_signal", "MACD signal", params, "oscillator", timestamps, signal_line),
            _series("macd_hist", "MACD histogram", params, "oscillator", timestamps, hist),
        ]

    if key == "bollinger":
        period = req.period or 20
        upper, middle, lower = ind.bollinger(closes, period=period, std_dev=2.0)
        params = {"period": period, "std_dev": 2.0}
        return [
            _series("bollinger_upper", f"BB upper({period})", params, "price", timestamps, upper),
            _series("bollinger_middle", f"BB middle({period})", params, "price", timestamps, middle),
            _series("bollinger_lower", f"BB lower({period})", params, "price", timestamps, lower),
        ]

    if key == "stochastic":
        k_period = req.period or 14
        smoothed_k, d_line = ind.stochastic(highs, lows, closes, k_period=k_period)
        params = {"k_period": k_period, "d_period": 3, "smooth": 3}
        return [
            _series("stochastic_k", f"Stoch %K({k_period})", params, "oscillator", timestamps, smoothed_k),
            _series("stochastic_d", "Stoch %D(3)", params, "oscillator", timestamps, d_line),
        ]

    if key == "adx":
        period = req.period or 14
        adx_line, plus_di, minus_di = ind.adx(highs, lows, closes, period=period)
        params = {"period": period}
        return [
            _series("adx", f"ADX({period})", params, "oscillator", timestamps, adx_line),
            _series("adx_plus_di", f"+DI({period})", params, "oscillator", timestamps, plus_di),
            _series("adx_minus_di", f"-DI({period})", params, "oscillator", timestamps, minus_di),
        ]

    if key == "ichimoku":
        conv, base, span_a, span_b = ind.ichimoku(highs, lows, closes)
        params = {"conversion": 9, "base": 26, "span_b": 52}
        return [
            _series("ichimoku_conversion", "Ichimoku Tenkan(9)", params, "price", timestamps, conv),
            _series("ichimoku_base", "Ichimoku Kijun(26)", params, "price", timestamps, base),
            _series("ichimoku_span_a", "Ichimoku Span A", params, "price", timestamps, span_a),
            _series("ichimoku_span_b", "Ichimoku Span B(52)", params, "price", timestamps, span_b),
        ]

    if key == "obv":
        return [_series("obv", "OBV", {}, "oscillator", timestamps, ind.obv(closes, volumes))]

    if key == "fib":
        lookback = req.period or 50
        l236, l382, l5, l618, l786 = ind.fibonacci_retracements(highs, lows, lookback=lookback)
        params = {"lookback": lookback}
        return [
            _series("fib_0_236", "Fib 23.6%", params, "price", timestamps, l236),
            _series("fib_0_382", "Fib 38.2%", params, "price", timestamps, l382),
            _series("fib_0_5", "Fib 50.0%", params, "price", timestamps, l5),
            _series("fib_0_618", "Fib 61.8%", params, "price", timestamps, l618),
            _series("fib_0_786", "Fib 78.6%", params, "price", timestamps, l786),
        ]

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported indicator '{key}'",
    )


@router.get("/market/chart-data", response_model=ChartDataResponse)
def get_chart_data(
    asset: str = Query(..., description="Asset pair, e.g. BTC/USDT"),
    timeframe: str = Query(..., description="Candle timeframe, e.g. 1d"),
    start: Optional[datetime] = Query(None, description="Inclusive start timestamp (ISO 8601)"),
    end: Optional[datetime] = Query(None, description="Inclusive end timestamp (ISO 8601)"),
    indicators: Optional[str] = Query(None, description="Comma-separated, e.g. ema:20,rsi:14"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ChartDataResponse:
    """Return stored OHLCV candles + selected indicator series for inspection."""
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset {asset} not supported",
        )
    if timeframe not in ALLOWED_TIMEFRAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Timeframe {timeframe} not supported",
        )
    if start and end and start > end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start must be <= end",
        )

    requests = _parse_indicators(indicators)

    stmt = select(Candle).where(Candle.asset == asset, Candle.timeframe == timeframe)
    if start:
        stmt = stmt.where(Candle.timestamp >= start)
    if end:
        stmt = stmt.where(Candle.timestamp <= end)
    stmt = stmt.order_by(Candle.timestamp.asc())
    rows = session.exec(stmt).all()

    candles = [
        ChartCandle(
            timestamp=r.timestamp,
            open=r.open, high=r.high, low=r.low, close=r.close, volume=r.volume,
        )
        for r in rows
    ]

    timestamps = [r.timestamp for r in rows]
    highs = [r.high for r in rows]
    lows = [r.low for r in rows]
    closes = [r.close for r in rows]
    volumes = [r.volume for r in rows]

    series: list[IndicatorSeries] = []
    for req in requests:
        if rows:
            series.extend(_compute_series(req, timestamps, highs, lows, closes, volumes))
        else:
            pane = "oscillator" if req.key in _OSCILLATOR_KEYS else "price"
            params = {"period": req.period} if req.period else {}
            series.append(_series(req.key, req.key.upper(), params, pane, [], []))

    avail_stmt = (
        select(Candle.timestamp)
        .where(Candle.asset == asset, Candle.timeframe == timeframe)
        .order_by(Candle.timestamp.asc())
    )
    all_timestamps = session.exec(avail_stmt).all()

    data_status = ChartDataStatus(
        has_candles=len(rows) > 0,
        earliest_candle=all_timestamps[0] if all_timestamps else None,
        latest_candle=all_timestamps[-1] if all_timestamps else None,
    )

    return ChartDataResponse(
        asset=asset,
        timeframe=timeframe,
        start=start,
        end=end,
        candles=candles,
        indicators=series,
        data_status=data_status,
    )
