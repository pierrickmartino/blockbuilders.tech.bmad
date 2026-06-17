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
) -> DecisionResult:
    """Detect flat→long entry transitions on candles strictly newer than watermark.

    Watermark always advances to run_date_to so the same candle never re-fires.
    The forming (not-yet-closed) candle must be excluded by the caller: pass
    only runs whose date_to ≤ last_closed_1d_candle_ts().
    """
    watermark_utc = _utc(watermark) if watermark is not None else None
    run_date_to_utc = _utc(run_date_to)
    fired: list[EntryFireEvent] = []

    for trade in trades:
        entry_time = _parse_ts(trade.get("entry_time"))
        if entry_time is None:
            continue
        entry_utc = _utc(entry_time)

        if watermark_utc is not None and entry_utc.date() <= watermark_utc.date():
            continue  # At or before watermark — already evaluated

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


def decide_exit_alert(
    trades: list[dict],
    watermark: datetime | None,
    run_date_to: datetime,
) -> ExitDecisionResult:
    """Detect long→flat exit transitions on candles strictly newer than watermark.

    Excludes end_of_data exits (backtest simply ended, not a real signal).
    Watermark always advances to run_date_to so the same candle never re-fires.
    """
    watermark_utc = _utc(watermark) if watermark is not None else None
    run_date_to_utc = _utc(run_date_to)
    fired: list[ExitFireEvent] = []

    for trade in trades:
        exit_reason = trade.get("exit_reason")
        if exit_reason == "end_of_data":
            continue

        exit_time = _parse_ts(trade.get("exit_time"))
        if exit_time is None:
            continue
        exit_utc = _utc(exit_time)

        if watermark_utc is not None and exit_utc.date() <= watermark_utc.date():
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
