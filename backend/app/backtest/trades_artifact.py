"""Backtest trades artifact — single seam for trades.json serialize/deserialize.

dump_trades: engine Trade list → wire-format dict list (written to S3 by worker).
load_trades: wire-format dict list → TradeDetail list (read by all response paths).

Storage (S3 upload/download) stays in the existing storage seam; this module is pure.
"""
from datetime import datetime

from app.backtest.position_manager import Trade
from app.schemas.backtest import TradeDetail


def dump_trades(trades: list[Trade]) -> list[dict]:
    """Serialize engine-produced trades to the trades.json wire shape."""
    result = []
    for t in trades:
        entry_time = t.entry_time.isoformat()
        result.append(
            {
                "entry_time": entry_time,
                "entry_price": t.entry_price,
                "exit_time": t.exit_time.isoformat(),
                "exit_price": t.exit_price,
                "side": t.side,
                "pnl": t.pnl,
                "pnl_pct": t.pnl_pct,
                "qty": t.qty,
                "sl_price_at_entry": t.sl_price_at_entry,
                "tp_price_at_entry": t.tp_price_at_entry,
                "exit_reason": t.exit_reason,
                "mae_usd": t.mae_usd,
                "mae_pct": t.mae_pct,
                "mfe_usd": t.mfe_usd,
                "mfe_pct": t.mfe_pct,
                "initial_risk_usd": t.initial_risk_usd,
                "r_multiple": t.r_multiple,
                "peak_price": t.peak_price,
                "peak_ts": t.peak_ts.isoformat() if t.peak_ts else entry_time,
                "trough_price": t.trough_price,
                "trough_ts": t.trough_ts.isoformat() if t.trough_ts else entry_time,
                "duration_seconds": t.duration_seconds,
                "fee_cost_usd": t.fee_cost_usd,
                "slippage_cost_usd": t.slippage_cost_usd,
                "spread_cost_usd": t.spread_cost_usd,
                "total_cost_usd": t.total_cost_usd,
                "notional_usd": t.notional_usd,
            }
        )
    return result


def _parse_ts(raw: str) -> datetime:
    return datetime.fromisoformat(raw.replace("Z", "+00:00"))


def load_trades(raw: list[dict]) -> list[TradeDetail]:
    """Decode trades.json wire format into TradeDetail response models.

    Backward-compatible: recomputes pnl_pct when absent (never returns 0%),
    falls back peak_ts/trough_ts to entry_time, and defaults optional cost
    and excursion fields. Raises ValueError for structurally invalid records.
    """
    result = []
    for t in raw:
        entry_ts_str = t.get("entry_time")
        exit_ts_str = t.get("exit_time")
        if entry_ts_str is None:
            raise ValueError("Trade record missing required field 'entry_time'")
        if exit_ts_str is None:
            raise ValueError("Trade record missing required field 'exit_time'")

        entry_ts = _parse_ts(entry_ts_str)
        exit_ts = _parse_ts(exit_ts_str)

        pnl_pct = t.get("pnl_pct")
        if pnl_pct is None:
            entry_price = t.get("entry_price")
            exit_price = t.get("exit_price")
            side = t.get("side", "long")
            if entry_price and exit_price:
                if side == "short":
                    pnl_pct = ((entry_price - exit_price) / entry_price) * 100
                else:
                    pnl_pct = ((exit_price - entry_price) / entry_price) * 100
            else:
                pnl_pct = 0.0

        peak_ts_raw = t.get("peak_ts") or entry_ts_str
        trough_ts_raw = t.get("trough_ts") or entry_ts_str

        result.append(
            TradeDetail(
                entry_time=entry_ts,
                entry_price=t.get("entry_price", 0),
                exit_time=exit_ts,
                exit_price=t.get("exit_price", 0),
                side=t.get("side", "long"),
                pnl=t.get("pnl", 0),
                pnl_pct=pnl_pct,
                qty=t.get("qty", 0),
                sl_price_at_entry=t.get("sl_price_at_entry"),
                tp_price_at_entry=t.get("tp_price_at_entry"),
                exit_reason=t.get("exit_reason", "unknown"),
                mae_usd=t.get("mae_usd", 0),
                mae_pct=t.get("mae_pct", 0),
                mfe_usd=t.get("mfe_usd", 0),
                mfe_pct=t.get("mfe_pct", 0),
                initial_risk_usd=t.get("initial_risk_usd"),
                r_multiple=t.get("r_multiple"),
                peak_price=t.get("peak_price", 0),
                peak_ts=_parse_ts(peak_ts_raw),
                trough_price=t.get("trough_price", 0),
                trough_ts=_parse_ts(trough_ts_raw),
                duration_seconds=t.get("duration_seconds", 0),
                fee_cost_usd=t.get("fee_cost_usd"),
                slippage_cost_usd=t.get("slippage_cost_usd"),
                spread_cost_usd=t.get("spread_cost_usd"),
                total_cost_usd=t.get("total_cost_usd"),
                notional_usd=t.get("notional_usd"),
            )
        )
    return result
