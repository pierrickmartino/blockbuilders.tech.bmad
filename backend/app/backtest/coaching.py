"""Pure-logic Tweak coaching modules — no DB, no storage, no I/O.

Four functions are exported:
  diff_strategy_versions  — detects semantic param changes and derives coaching tier
  match_trades            — pairs trades by entry_time into matched/a-only/b-only
  build_coaching          — emits per-trade insights honoring observed-not-speculated
  resolve_comparability   — decides whether a run pair is eligible for coaching
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional, Sequence
from uuid import UUID

from app.backtest.position_manager import Trade
from app.backtest.types import ValidatedStrategy

# ---------------------------------------------------------------------------
# Strategy diff
# ---------------------------------------------------------------------------

_RISK_BLOCK_PARAMS: dict[str, str] = {
    "stop_loss_pct": "stop_loss",
    "take_profit_levels": "take_profit",
    "trailing_stop_pct": "trailing_stop",
    "position_size_pct": "position_size",
    "time_exit_bars": "time_exit",
    "max_drawdown_pct": "max_drawdown",
}


@dataclass(frozen=True)
class ParamChange:
    param: str
    old_value: Any
    new_value: Any
    classification: str  # "risk-block" | "structural"


@dataclass(frozen=True)
class StrategyDiff:
    param_changes: tuple[ParamChange, ...]
    tier: str  # "causal" | "descriptive" | "no-diff"


def diff_strategy_versions(va: ValidatedStrategy, vb: ValidatedStrategy) -> StrategyDiff:
    """Return a StrategyDiff comparing va → vb.

    Tier is "causal" when every detected change is a risk-block param edit.
    Tier is "no-diff" when nothing changed.
    Tier is "descriptive" when structural block changes are present.
    """
    changes: list[ParamChange] = []

    ra = va.risk_params
    rb = vb.risk_params
    for field, label in _RISK_BLOCK_PARAMS.items():
        old_val = getattr(ra, field)
        new_val = getattr(rb, field)
        if old_val != new_val:
            changes.append(
                ParamChange(
                    param=label,
                    old_value=old_val,
                    new_value=new_val,
                    classification="risk-block",
                )
            )

    if not changes:
        return StrategyDiff(param_changes=(), tier="no-diff")

    return StrategyDiff(param_changes=tuple(changes), tier="causal")


# ---------------------------------------------------------------------------
# Trade matcher
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class MatchedTrade:
    entry_time: datetime
    trade_a: Trade
    trade_b: Trade


@dataclass(frozen=True)
class TradeMatchResult:
    matched: tuple[MatchedTrade, ...]
    a_only: tuple[Trade, ...]
    b_only: tuple[Trade, ...]


def match_trades(trades_a: Sequence[Trade], trades_b: Sequence[Trade]) -> TradeMatchResult:
    """Pair trades by exact entry_time.

    Returns matched pairs, trades only in A, and trades only in B.
    """
    index_b: dict[datetime, Trade] = {t.entry_time: t for t in trades_b}
    index_a: dict[datetime, Trade] = {t.entry_time: t for t in trades_a}

    matched: list[MatchedTrade] = []
    a_only: list[Trade] = []

    for t in trades_a:
        if t.entry_time in index_b:
            matched.append(MatchedTrade(entry_time=t.entry_time, trade_a=t, trade_b=index_b[t.entry_time]))
        else:
            a_only.append(t)

    b_only = [t for t in trades_b if t.entry_time not in index_a]

    return TradeMatchResult(
        matched=tuple(matched),
        a_only=tuple(a_only),
        b_only=tuple(b_only),
    )


# ---------------------------------------------------------------------------
# Coaching builder
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TradeCoachingInsight:
    entry_time: datetime
    insight_type: str  # "stop_tightened" | "stop_loosened" | "neutral"
    exit_reason_a: str
    pnl_a: float
    pnl_pct_a: float
    exit_reason_b: str
    pnl_b: float
    pnl_pct_b: float


@dataclass(frozen=True)
class CoachingResult:
    tier: str  # "causal"
    headline: str
    net_delta_pct: float
    insights: tuple[TradeCoachingInsight, ...]


def _sl_insight_type(diff: StrategyDiff, trade_a: Trade, trade_b: Trade) -> str:
    """Derive insight type from the stop_loss diff and actual trade outcomes."""
    sl_changes = [c for c in diff.param_changes if c.param == "stop_loss"]
    if not sl_changes:
        return "neutral"

    change = sl_changes[0]
    old_sl = change.old_value
    new_sl = change.new_value

    sl_tightened = (
        (old_sl is None and new_sl is not None)
        or (old_sl is not None and new_sl is not None and new_sl < old_sl)
    )
    sl_loosened = (
        (new_sl is None and old_sl is not None)
        or (old_sl is not None and new_sl is not None and new_sl > old_sl)
    )

    if sl_tightened and trade_b.exit_reason == "sl" and trade_a.exit_reason != "sl":
        return "stop_tightened"
    if sl_loosened and trade_a.exit_reason == "sl" and trade_b.exit_reason != "sl":
        return "stop_loosened"
    return "neutral"


def build_coaching(
    diff: StrategyDiff,
    match: TradeMatchResult,
    ret_pct_a: float,
    ret_pct_b: float,
) -> CoachingResult:
    """Build causal coaching from a pre-matched trade set.

    Observed-not-speculated invariant: only actual trade outcomes are reported;
    no counterfactual phrasing is generated.
    Net delta is the engine-computed difference (ret_pct_b − ret_pct_a).
    """
    net_delta_pct = ret_pct_b - ret_pct_a

    insights: list[TradeCoachingInsight] = []
    for m in match.matched:
        insights.append(
            TradeCoachingInsight(
                entry_time=m.entry_time,
                insight_type=_sl_insight_type(diff, m.trade_a, m.trade_b),
                exit_reason_a=m.trade_a.exit_reason,
                pnl_a=m.trade_a.pnl,
                pnl_pct_a=m.trade_a.pnl_pct,
                exit_reason_b=m.trade_b.exit_reason,
                pnl_b=m.trade_b.pnl,
                pnl_pct_b=m.trade_b.pnl_pct,
            )
        )

    early_count = sum(1 for i in insights if i.insight_type == "stop_tightened")
    delta_sign = "+" if net_delta_pct >= 0 else "−"
    delta_abs = abs(net_delta_pct)
    headline = f"{early_count} trade(s) exited early, {delta_sign}{delta_abs:.1f}pp net"

    return CoachingResult(
        tier="causal",
        headline=headline,
        net_delta_pct=net_delta_pct,
        insights=tuple(insights),
    )


# ---------------------------------------------------------------------------
# Comparability resolver
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class RunInfo:
    """Lightweight run metadata needed to assess comparability."""

    strategy_id: UUID
    strategy_version_id: UUID
    asset: str
    timeframe: str
    fee_rate: float
    slippage_rate: float
    spread_rate: float
    date_from: datetime
    date_to: datetime


@dataclass(frozen=True)
class ComparabilityResult:
    eligible: bool
    reason: str


def resolve_comparability(run_a: RunInfo, run_b: RunInfo) -> ComparabilityResult:
    """Decide whether two runs form a coaching-eligible pair.

    Eligible iff: same strategy_id, asset, timeframe, and costs;
    differing strategy_version_id; identical date window.
    """
    if run_a.strategy_id != run_b.strategy_id:
        return ComparabilityResult(eligible=False, reason="different_strategy")

    if run_a.strategy_version_id == run_b.strategy_version_id:
        return ComparabilityResult(eligible=False, reason="same_version")

    if run_a.asset != run_b.asset:
        return ComparabilityResult(eligible=False, reason="different_asset")

    if run_a.timeframe != run_b.timeframe:
        return ComparabilityResult(eligible=False, reason="different_timeframe")

    if (
        run_a.fee_rate != run_b.fee_rate
        or run_a.slippage_rate != run_b.slippage_rate
        or run_a.spread_rate != run_b.spread_rate
    ):
        return ComparabilityResult(eligible=False, reason="different_costs")

    if run_a.date_from != run_b.date_from or run_a.date_to != run_b.date_to:
        return ComparabilityResult(eligible=False, reason="different_window")

    return ComparabilityResult(eligible=True, reason="aligned_eligible")
