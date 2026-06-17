"""Signal-framed webhook payload builders for execution handoff.

These are pure functions — no side effects, no I/O.
The signal-not-order invariant is structural: the builders have no parameters
for and cannot emit order primitives (side, size, leverage, price targets,
strategy graph).
"""
from datetime import datetime, timezone


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
    candle_ts_utc = candle_ts if candle_ts.tzinfo else candle_ts.replace(tzinfo=timezone.utc)
    return {
        "type": "performance_alert",
        "event": "entry",
        "strategy_name": strategy_name,
        "strategy_version_id": str(strategy_version_id),
        "asset": asset,
        "timeframe": timeframe,
        "candle_ts": candle_ts_utc.isoformat(),
        "result_url": result_url,
        "fired_at": datetime.now(timezone.utc).isoformat(),
    }
