"""Pure decision functions for performance alert conditions.

This module is side-effect free. Callers are responsible for DB and
notification operations after receiving a result.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


def _parse_ts(ts: Any) -> datetime | None:
    if ts is None:
        return None
    if isinstance(ts, datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _period_open(dt: datetime, timeframe: str) -> datetime:
    """Return the open-timestamp of the candle period containing *dt*."""
    if timeframe == "1d":
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)
    if timeframe == "4h":
        period_hour = (dt.hour // 4) * 4
        return dt.replace(hour=period_hour, minute=0, second=0, microsecond=0)
    # "1h"
    return dt.replace(minute=0, second=0, microsecond=0)


# ── Entry ────────────────────────────────────────────────────────────────────

@dataclass
class EntryFireEvent:
    entry_time: datetime


@dataclass
class DecisionResult:
    fired_events: list[EntryFireEvent] = field(default_factory=list)
    new_watermark: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def decide_entry_alert(
    trades: list[dict],
    watermark: datetime | None,
    run_date_to: datetime,
    timeframe: str = "1d",
) -> DecisionResult:
    """Detect flat→long entry transitions on candles strictly newer than watermark.

    Watermark always advances to run_date_to so the same candle never re-fires.
    The forming (not-yet-closed) candle must be excluded by the caller: pass
    only runs whose date_to ≤ last_closed_candle_ts(timeframe).
    """
    watermark_utc = _utc(watermark) if watermark is not None else None
    run_date_to_utc = _utc(run_date_to)
    fired: list[EntryFireEvent] = []

    for trade in trades:
        entry_time = _parse_ts(trade.get("entry_time"))
        if entry_time is None:
            continue
        entry_utc = _utc(entry_time)

        if watermark_utc is not None:
            if _period_open(entry_utc, timeframe) <= _period_open(watermark_utc, timeframe):
                continue  # Same period as watermark or earlier — already evaluated

        fired.append(EntryFireEvent(entry_time=entry_utc))

    return DecisionResult(fired_events=fired, new_watermark=run_date_to_utc)


# ── Exit ─────────────────────────────────────────────────────────────────────

@dataclass
class ExitFireEvent:
    exit_time: datetime
    exit_reason: str | None


@dataclass
class ExitDecisionResult:
    fired_events: list[ExitFireEvent] = field(default_factory=list)
    new_watermark: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def _latest_exit_by_entry(trades: list[dict]) -> dict[tuple, datetime]:
    """Map each position's entry identity to its latest exit timestamp.

    A multi-level take-profit ladder records a partial ``tp`` trade for every
    scale-out while the position stays open; all partials plus the eventual
    full close share the same entry_time/entry_price. The trade with the latest
    exit is the one that actually closed the position.
    """
    latest: dict[tuple, datetime] = {}
    for trade in trades:
        exit_time = _parse_ts(trade.get("exit_time"))
        if exit_time is None:
            continue
        key = (trade.get("entry_time"), trade.get("entry_price"))
        exit_utc = _utc(exit_time)
        current = latest.get(key)
        if current is None or exit_utc > current:
            latest[key] = exit_utc
    return latest


def decide_exit_alert(
    trades: list[dict],
    watermark: datetime | None,
    run_date_to: datetime,
    timeframe: str = "1d",
) -> ExitDecisionResult:
    """Detect long→flat exit transitions on candles strictly newer than watermark.

    Excludes end_of_data exits (backtest simply ended, not a real signal) and
    partial take-profit scale-outs (the position is still open — only the trade
    that actually closes the position represents a real exit).
    Watermark always advances to run_date_to so the same candle never re-fires.
    """
    watermark_utc = _utc(watermark) if watermark is not None else None
    run_date_to_utc = _utc(run_date_to)
    fired: list[ExitFireEvent] = []

    latest_exit_by_entry = _latest_exit_by_entry(trades)

    for trade in trades:
        exit_reason = trade.get("exit_reason")
        if exit_reason == "end_of_data":
            continue

        exit_time = _parse_ts(trade.get("exit_time"))
        if exit_time is None:
            continue
        exit_utc = _utc(exit_time)

        # Skip partial scale-outs: a strictly later exit for the same entry
        # means this trade did not close the position (still long).
        key = (trade.get("entry_time"), trade.get("entry_price"))
        if exit_utc < latest_exit_by_entry.get(key, exit_utc):
            continue

        if watermark_utc is not None:
            if _period_open(exit_utc, timeframe) <= _period_open(watermark_utc, timeframe):
                continue

        fired.append(ExitFireEvent(exit_time=exit_utc, exit_reason=exit_reason))

    return ExitDecisionResult(fired_events=fired, new_watermark=run_date_to_utc)


# ── Drawdown crossing ────────────────────────────────────────────────────────

@dataclass
class DrawdownDecisionResult:
    fired: bool
    current_drawdown_pct: float


def decide_drawdown_alert(
    equity_curve: list[dict],
    threshold_pct: float,
    last_drawdown_pct: float | None,
) -> DrawdownDecisionResult:
    """Fire on a below→above level-crossing of drawdown threshold.

    Crossing semantics:
      - Fires when last_drawdown_pct < threshold_pct AND current >= threshold_pct.
      - None last_drawdown_pct is treated as 0 (alert is armed from the start).
      - Returns current_drawdown_pct so the caller can persist the new state.
    """
    if not equity_curve:
        return DrawdownDecisionResult(fired=False, current_drawdown_pct=0.0)

    peak = max(pt.get("equity", 0) for pt in equity_curve)
    if peak <= 0:
        return DrawdownDecisionResult(fired=False, current_drawdown_pct=0.0)

    last_equity = equity_curve[-1].get("equity", peak)
    current_dd = ((peak - last_equity) / peak) * 100.0

    prev_dd = last_drawdown_pct if last_drawdown_pct is not None else 0.0
    crossed = prev_dd < threshold_pct and current_dd >= threshold_pct

    return DrawdownDecisionResult(fired=crossed, current_drawdown_pct=current_dd)
