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
    A-only / B-only counts capture the capital-availability side-effect.
    """
    net_delta_pct = ret_pct_b - ret_pct_a

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

    delta_sign = "+" if net_delta_pct >= 0 else "−"
    delta_abs = abs(net_delta_pct)
    parts = [f"{early_count} trade(s) exited early, {delta_sign}{delta_abs:.1f}pp net"]
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
