"""Signal-framed webhook payload builders for execution handoff.

These are pure functions — no side effects, no I/O.
The signal-not-order invariant is structural: the builders have no parameters
for and cannot emit order primitives (side, size, leverage, price targets,
strategy graph).
"""
from datetime import datetime, timezone


def _common_fields(
    *,
    strategy_name: str,
    strategy_version_id: str,
    asset: str,
    timeframe: str,
    candle_ts: datetime,
    result_url: str,
) -> dict:
    candle_ts_utc = candle_ts if candle_ts.tzinfo else candle_ts.replace(tzinfo=timezone.utc)
    return {
        "type": "performance_alert",
        "strategy_name": strategy_name,
        "strategy_version_id": str(strategy_version_id),
        "asset": asset,
        "timeframe": timeframe,
        "candle_ts": candle_ts_utc.isoformat(),
        "result_url": result_url,
        "fired_at": datetime.now(timezone.utc).isoformat(),
    }


def build_entry_payload(
    *,
    strategy_name: str,
    strategy_version_id: str,
    asset: str,
    timeframe: str,
    candle_ts: datetime,
    result_url: str,
) -> dict:
    """Build the signal-framed JSON payload for a flat→long entry event."""
    return {"event": "entry", **_common_fields(
        strategy_name=strategy_name,
        strategy_version_id=strategy_version_id,
        asset=asset,
        timeframe=timeframe,
        candle_ts=candle_ts,
        result_url=result_url,
    )}


def build_exit_payload(
    *,
    strategy_name: str,
    strategy_version_id: str,
    asset: str,
    timeframe: str,
    candle_ts: datetime,
    result_url: str,
    exit_reason: str | None,
) -> dict:
    """Build the signal-framed JSON payload for a long→flat exit event."""
    return {"event": "exit", "exit_reason": exit_reason, **_common_fields(
        strategy_name=strategy_name,
        strategy_version_id=strategy_version_id,
        asset=asset,
        timeframe=timeframe,
        candle_ts=candle_ts,
        result_url=result_url,
    )}


def build_drawdown_payload(
    *,
    strategy_name: str,
    strategy_version_id: str,
    asset: str,
    timeframe: str,
    candle_ts: datetime,
    result_url: str,
    drawdown_pct: float,
) -> dict:
    """Build the signal-framed JSON payload for a drawdown threshold crossing."""
    return {"event": "drawdown_threshold", "drawdown_pct": drawdown_pct, **_common_fields(
        strategy_name=strategy_name,
        strategy_version_id=strategy_version_id,
        asset=asset,
        timeframe=timeframe,
        candle_ts=candle_ts,
        result_url=result_url,
    )}
