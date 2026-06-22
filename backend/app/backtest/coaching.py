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
class StructuralChange:
    change_type: str  # "block_added" | "block_removed" | "block_changed" | "connection_added" | "connection_removed"
    block_id: Optional[str] = None
    block_type: Optional[str] = None


@dataclass(frozen=True)
class StrategyDiff:
    param_changes: tuple[ParamChange, ...]
    tier: str  # "causal" | "descriptive" | "no-diff"
    structural_changes: tuple[StructuralChange, ...] = ()


def diff_strategy_versions(va: ValidatedStrategy, vb: ValidatedStrategy) -> StrategyDiff:
    """Return a StrategyDiff comparing va → vb.

    Tier is "causal" when every detected change is a risk-block param edit.
    Tier is "no-diff" when nothing changed.
    Tier is "descriptive" when any structural block change is present (block
    add/remove/change or connection change), even when risk-block params also changed.
    """
    risk_changes: list[ParamChange] = []
    ra = va.risk_params
    rb = vb.risk_params
    for field, label in _RISK_BLOCK_PARAMS.items():
        old_val = getattr(ra, field)
        new_val = getattr(rb, field)
        if old_val != new_val:
            risk_changes.append(
                ParamChange(
                    param=label,
                    old_value=old_val,
                    new_value=new_val,
                    classification="risk-block",
                )
            )

    structural: list[StructuralChange] = []
    blocks_a = {b["id"]: b for b in va.blocks}
    blocks_b = {b["id"]: b for b in vb.blocks}

    for bid, block in blocks_a.items():
        if bid not in blocks_b:
            structural.append(StructuralChange(change_type="block_removed", block_id=bid, block_type=block.get("type")))
        elif block != blocks_b[bid]:
            structural.append(StructuralChange(change_type="block_changed", block_id=bid, block_type=block.get("type")))

    for bid, block in blocks_b.items():
        if bid not in blocks_a:
            structural.append(StructuralChange(change_type="block_added", block_id=bid, block_type=block.get("type")))

    conns_a = {(c["from"], c["to"]) for c in va.connections}
    conns_b = {(c["from"], c["to"]) for c in vb.connections}
    for _ in conns_a - conns_b:
        structural.append(StructuralChange(change_type="connection_removed"))
    for _ in conns_b - conns_a:
        structural.append(StructuralChange(change_type="connection_added"))

    if not risk_changes and not structural:
        return StrategyDiff(param_changes=(), tier="no-diff")

    if structural:
        return StrategyDiff(param_changes=tuple(risk_changes), tier="descriptive", structural_changes=tuple(structural))

    return StrategyDiff(param_changes=tuple(risk_changes), tier="causal")


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
    entry_times_a: set[datetime] = {t.entry_time for t in trades_a}

    matched: list[MatchedTrade] = []
    a_only: list[Trade] = []

    for t in trades_a:
        if t.entry_time in index_b:
            matched.append(MatchedTrade(entry_time=t.entry_time, trade_a=t, trade_b=index_b[t.entry_time]))
        else:
            a_only.append(t)

    b_only = [t for t in trades_b if t.entry_time not in entry_times_a]

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
    tier: str  # "causal" | "descriptive"
    headline: str
    net_delta_pct: float
    insights: tuple[TradeCoachingInsight, ...]
    a_only_count: int = 0
    b_only_count: int = 0


_EXIT_REASON_KNOB: dict[str, str] = {
    "sl": "stop_loss",
    "tp": "take_profit",
    "trailing_stop": "trailing_stop",
    "ts": "trailing_stop",
    "time_exit": "time_exit",
}

_EARLY_EXIT_TYPES = frozenset(
    {"stop_tightened", "take_profit_tightened", "trailing_stop_tightened", "time_exit_shortened"}
)


def _exit_timing_insight_type(diff: StrategyDiff, trade_a: Trade, trade_b: Trade) -> str:
    """Route the matched-pair exit difference to the responsible risk knob.

    Uses exit_reason as the primary router when multiple knobs changed simultaneously.
    B's exit reason takes priority — it reveals which knob triggered in B.
    """
    changed_knobs: dict[str, ParamChange] = {c.param: c for c in diff.param_changes}
    exit_a = trade_a.exit_reason
    exit_b = trade_b.exit_reason

    responsible_knob: Optional[str] = None

    knob_b = _EXIT_REASON_KNOB.get(exit_b)
    if knob_b and knob_b in changed_knobs and exit_a != exit_b:
        responsible_knob = knob_b

    if responsible_knob is None:
        knob_a = _EXIT_REASON_KNOB.get(exit_a)
        if knob_a and knob_a in changed_knobs and exit_a != exit_b:
            responsible_knob = knob_a

    if responsible_knob is None:
        return "neutral"

    change = changed_knobs[responsible_knob]

    if responsible_knob == "stop_loss":
        old_sl = change.old_value
        new_sl = change.new_value
        sl_tightened = (old_sl is None and new_sl is not None) or (
            old_sl is not None and new_sl is not None and new_sl < old_sl
        )
        sl_loosened = (new_sl is None and old_sl is not None) or (
            old_sl is not None and new_sl is not None and new_sl > old_sl
        )
        if sl_tightened and exit_b == "sl" and exit_a != "sl":
            return "stop_tightened"
        if sl_loosened and exit_a == "sl" and exit_b != "sl":
            return "stop_loosened"

    if responsible_knob == "take_profit":
        if exit_b == "tp" and exit_a != "tp":
            return "take_profit_tightened"
        if exit_a == "tp" and exit_b != "tp":
            return "take_profit_loosened"

    if responsible_knob == "trailing_stop":
        if exit_b in ("trailing_stop", "ts") and exit_a not in ("trailing_stop", "ts"):
            return "trailing_stop_tightened"
        if exit_a in ("trailing_stop", "ts") and exit_b not in ("trailing_stop", "ts"):
            return "trailing_stop_loosened"

    if responsible_knob == "time_exit":
        if exit_b == "time_exit" and exit_a != "time_exit":
            return "time_exit_shortened"
        if exit_a == "time_exit" and exit_b != "time_exit":
            return "time_exit_extended"

    return "neutral"


def _delta_str(net_delta_pct: float) -> str:
    sign = "+" if net_delta_pct >= 0 else "−"
    return f"{sign}{abs(net_delta_pct):.1f}pp net"


def _ps_scale(change: ParamChange) -> float:
    """P&L scale factor for a position_size change, guarding a zero baseline."""
    old_val = change.old_value or 1.0
    return change.new_value / old_val


def _position_size_headline(diff: StrategyDiff, net_delta_pct: float) -> str:
    change = next(c for c in diff.param_changes if c.param == "position_size")
    scale = _ps_scale(change)
    return f"same trades, same timing, P&L scaled ~{scale:.1f}x; {_delta_str(net_delta_pct)}"


def _max_drawdown_direction(change: ParamChange) -> str:
    if change.new_value is None:
        return "loosened"
    if change.old_value is None:
        return "tightened"
    return "tightened" if change.new_value < change.old_value else "loosened"


def _max_drawdown_headline(diff: StrategyDiff, match: TradeMatchResult, net_delta_pct: float) -> str:
    change = next(c for c in diff.param_changes if c.param == "max_drawdown")
    direction = _max_drawdown_direction(change)
    delta = _delta_str(net_delta_pct)

    if direction == "tightened" and match.a_only:
        halt_date = min(t.entry_time for t in match.a_only).date()
        n = len(match.a_only)
        return f"kill-switch tightened: {n} entr{'y' if n == 1 else 'ies'} skipped from {halt_date}; {delta}"

    if direction == "loosened" and match.b_only:
        first_date = min(t.entry_time for t in match.b_only).date()
        n = len(match.b_only)
        return f"kill-switch loosened: {n} entr{'y' if n == 1 else 'ies'} allowed from {first_date}; {delta}"

    return f"kill-switch {direction}; {delta}"


def _position_size_and_max_drawdown_headline(diff: StrategyDiff, match: TradeMatchResult, net_delta_pct: float) -> str:
    ps_change = next(c for c in diff.param_changes if c.param == "position_size")
    md_change = next(c for c in diff.param_changes if c.param == "max_drawdown")
    scale = _ps_scale(ps_change)
    direction = _max_drawdown_direction(md_change)
    delta = _delta_str(net_delta_pct)
    return f"P&L scaled ~{scale:.1f}x (position_size); kill-switch {direction} (max_drawdown); {delta}"


def _build_descriptive_coaching(
    diff: StrategyDiff,
    match: TradeMatchResult,
    net_delta_pct: float,
) -> CoachingResult:
    """Build descriptive (Tier 2) coaching for structural edits.

    Emits: change-list + net delta + set-level facts + no-attribution disclaimer.
    Never pairs trades, never routes via exit_reason, never makes a causal claim.
    """
    n_a = len(match.matched) + len(match.a_only)
    n_b = len(match.matched) + len(match.b_only)

    if n_b == 0 and n_a > 0:
        headline = f"your stricter entry stopped triggering: 0 trades vs. {n_a}"
        return CoachingResult(
            tier="descriptive",
            headline=headline,
            net_delta_pct=net_delta_pct,
            insights=(),
            a_only_count=n_a,
            b_only_count=0,
        )

    changes: list[str] = []
    for sc in diff.structural_changes:
        if sc.change_type == "block_added":
            changes.append(f"{sc.block_type or 'block'} added")
        elif sc.change_type == "block_removed":
            changes.append(f"{sc.block_type or 'block'} removed")
        elif sc.change_type == "block_changed":
            changes.append(f"{sc.block_type or 'block'} changed")
        elif sc.change_type == "connection_added":
            changes.append("connection added")
        elif sc.change_type == "connection_removed":
            changes.append("connection removed")
    for pc in diff.param_changes:
        changes.append(f"{pc.param} changed")

    change_list = "; ".join(changes)
    set_facts = f"{n_b} trades vs. {n_a}"
    delta = _delta_str(net_delta_pct)
    if len(changes) > 1:
        disclaimer = "two things changed, so we can't isolate which drove the result"
    else:
        disclaimer = "entries moved, so per-trade attribution isn't provable"

    headline = f"{change_list}; {set_facts}; {delta}; {disclaimer}"
    return CoachingResult(
        tier="descriptive",
        headline=headline,
        net_delta_pct=net_delta_pct,
        insights=(),
        a_only_count=len(match.a_only),
        b_only_count=len(match.b_only),
    )


def build_coaching(
    diff: StrategyDiff,
    match: TradeMatchResult,
    ret_pct_a: float,
    ret_pct_b: float,
) -> CoachingResult:
    """Build coaching from a pre-matched trade set.

    Routes to the descriptive path when diff.tier is "descriptive" (structural edits).
    For causal tier: observed-not-speculated invariant, exit_reason routing, reconciliation.
    Net delta is always the engine-computed difference (ret_pct_b − ret_pct_a).
    """
    net_delta_pct = ret_pct_b - ret_pct_a

    if diff.tier == "descriptive":
        return _build_descriptive_coaching(diff, match, net_delta_pct)

    insights: list[TradeCoachingInsight] = []
    for m in match.matched:
        insights.append(
            TradeCoachingInsight(
                entry_time=m.entry_time,
                insight_type=_exit_timing_insight_type(diff, m.trade_a, m.trade_b),
                exit_reason_a=m.trade_a.exit_reason,
                pnl_a=m.trade_a.pnl,
                pnl_pct_a=m.trade_a.pnl_pct,
                exit_reason_b=m.trade_b.exit_reason,
                pnl_b=m.trade_b.pnl,
                pnl_pct_b=m.trade_b.pnl_pct,
            )
        )

    early_count = sum(1 for i in insights if i.insight_type in _EARLY_EXIT_TYPES)
    a_only_count = len(match.a_only)
    b_only_count = len(match.b_only)

    changed_params = {c.param for c in diff.param_changes}
    if changed_params == {"position_size"}:
        headline = _position_size_headline(diff, net_delta_pct)
    elif changed_params == {"max_drawdown"}:
        headline = _max_drawdown_headline(diff, match, net_delta_pct)
    elif changed_params == {"position_size", "max_drawdown"}:
        headline = _position_size_and_max_drawdown_headline(diff, match, net_delta_pct)
    else:
        parts = [f"{early_count} trade(s) exited early, {_delta_str(net_delta_pct)}"]
        if a_only_count:
            parts.append(f"{a_only_count} A-only (capital-availability side-effect)")
        if b_only_count:
            parts.append(f"{b_only_count} B-only (capital-availability side-effect)")
        headline = "; ".join(parts)

    return CoachingResult(
        tier="causal",
        headline=headline,
        net_delta_pct=net_delta_pct,
        insights=tuple(insights),
        a_only_count=a_only_count,
        b_only_count=b_only_count,
    )


# ---------------------------------------------------------------------------
# Comparability resolver
# ---------------------------------------------------------------------------

MIN_OVERLAP_CANDLES = 10

_TIMEFRAME_SECONDS: dict[str, int] = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
}


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
    needs_rerun: bool = False
    intersection_from: Optional[datetime] = None
    intersection_to: Optional[datetime] = None


def resolve_comparability(run_a: RunInfo, run_b: RunInfo) -> ComparabilityResult:
    """Decide whether two runs form a coaching-eligible pair.

    Eligible iff: same strategy_id, asset, timeframe, and costs;
    differing strategy_version_id; windows overlap by at least MIN_OVERLAP_CANDLES.

    When windows differ but overlap sufficiently, returns needs_rerun=True
    with intersection_from/intersection_to set to the overlapping window.
    When windows are identical, returns needs_rerun=False.
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

    intersection_from = max(run_a.date_from, run_b.date_from)
    intersection_to = min(run_a.date_to, run_b.date_to)

    if intersection_from >= intersection_to:
        return ComparabilityResult(eligible=False, reason="no_overlap")

    tf_seconds = _TIMEFRAME_SECONDS.get(run_a.timeframe, 3600)
    overlap_seconds = (intersection_to - intersection_from).total_seconds()
    if overlap_seconds / tf_seconds < MIN_OVERLAP_CANDLES:
        return ComparabilityResult(eligible=False, reason="insufficient_overlap")

    windows_aligned = (
        run_a.date_from == run_b.date_from and run_a.date_to == run_b.date_to
    )
    if windows_aligned:
        return ComparabilityResult(eligible=True, reason="aligned_eligible", needs_rerun=False)

    return ComparabilityResult(
        eligible=True,
        reason="aligned_eligible",
        needs_rerun=True,
        intersection_from=intersection_from,
        intersection_to=intersection_to,
    )
