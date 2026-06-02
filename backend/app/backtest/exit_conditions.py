"""Data-driven exit-priority abstractions for the backtest engine.

This module is intentionally decoupled from run_backtest — it exports pure
value types and pure checker functions only. The engine consumes them in a
separate slice (issue #399).
"""
from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable, Optional

if TYPE_CHECKING:
    from app.backtest.position_manager import TPLevelState
    from app.models.candle import Candle


@dataclass(frozen=True)
class PositionContext:
    """Snapshot of all state needed to evaluate exit conditions for one candle."""

    candle: "Candle"
    entry_price: float
    sl_price: Optional[float]
    highest_close_since_entry: float
    bars_in_trade: int
    tp_levels: list  # list[TPLevelState] — avoid circular import at runtime
    position_size: float
    initial_qty: float
    trailing_stop_threshold: Optional[float]
    max_dd_threshold: Optional[float]
    time_exit_threshold: Optional[int]
    exit_signal: bool


@dataclass(frozen=True)
class ExitDecision:
    """Full-exit decision produced by a checker function."""

    exit_price_raw: float
    reason: str  # short codes: "sl", "trailing_stop", "max_dd", "time_exit", "signal"


@dataclass(frozen=True)
class PartialExit:
    """Partial-exit plan entry produced by apply_take_profit_ladder."""

    level_index: int   # original index in PositionContext.tp_levels
    qty: float
    exit_price_raw: float


@dataclass(frozen=True)
class CandleExit:
    """Result of evaluating all exit conditions for one candle.

    Invariant: if ``full`` is not None, ``partials`` must be empty — a full
    exit preempts the take-profit ladder. The type encodes this so callers
    cannot accidentally act on both.
    """

    full: "ExitDecision | None"
    partials: "list[PartialExit]"


@dataclass(frozen=True)
class ExitCondition:
    """Named exit condition pairing a long-form name with its checker function."""

    name: str  # long form: "stop_loss", "trailing_stop", etc.
    check: Callable[[PositionContext], Optional[ExitDecision]]


# ---------------------------------------------------------------------------
# Pure checker functions
# ---------------------------------------------------------------------------

def check_stop_loss(ctx: PositionContext) -> Optional[ExitDecision]:
    if ctx.sl_price is None:
        return None
    if ctx.candle.low <= ctx.sl_price:
        return ExitDecision(exit_price_raw=ctx.sl_price, reason="sl")
    return None


def check_trailing_stop(ctx: PositionContext) -> Optional[ExitDecision]:
    if ctx.trailing_stop_threshold is None:
        return None
    trailing_stop_price = ctx.highest_close_since_entry * (1 - ctx.trailing_stop_threshold / 100)
    if ctx.candle.low <= trailing_stop_price:
        return ExitDecision(exit_price_raw=trailing_stop_price, reason="trailing_stop")
    return None


def check_max_drawdown(ctx: PositionContext) -> Optional[ExitDecision]:
    if ctx.max_dd_threshold is None:
        return None
    trade_drawdown = (ctx.entry_price - ctx.candle.close) / ctx.entry_price * 100
    if trade_drawdown >= ctx.max_dd_threshold:
        return ExitDecision(exit_price_raw=ctx.candle.close, reason="max_dd")
    return None


def check_time_exit(ctx: PositionContext) -> Optional[ExitDecision]:
    if ctx.time_exit_threshold is None:
        return None
    if ctx.bars_in_trade >= ctx.time_exit_threshold:
        return ExitDecision(exit_price_raw=ctx.candle.close, reason="time_exit")
    return None


def check_exit_signal(ctx: PositionContext) -> Optional[ExitDecision]:
    if ctx.exit_signal:
        return ExitDecision(exit_price_raw=ctx.candle.close, reason="signal")
    return None


# ---------------------------------------------------------------------------
# Take-profit ladder planner
# ---------------------------------------------------------------------------

def apply_take_profit_ladder(ctx: PositionContext) -> list[PartialExit]:
    """Return a list of partial-exit plans for all TP levels hit this candle.

    Levels are evaluated in ascending profit_pct order. The returned
    level_index refers to the original position in ctx.tp_levels so the
    engine can flip triggered without a linear search.

    Does NOT mutate ctx.tp_levels — the engine marks levels triggered using
    the returned level_index values.
    """
    result: list[PartialExit] = []
    running_size = ctx.position_size

    for original_idx, level in sorted(
        enumerate(ctx.tp_levels), key=lambda pair: pair[1].profit_pct
    ):
        if level.triggered:
            continue
        if ctx.candle.high < level.price:
            continue
        qty = min(ctx.initial_qty * level.close_pct / 100, running_size)
        if qty <= 0:
            break
        result.append(PartialExit(level_index=original_idx, qty=qty, exit_price_raw=level.price))
        running_size -= qty
        if running_size <= 0:
            break

    return result


# ---------------------------------------------------------------------------
# Priority sequence constant
# ---------------------------------------------------------------------------

EXIT_PRIORITY_SEQUENCE: list[ExitCondition] = [
    ExitCondition(name="stop_loss", check=check_stop_loss),
    ExitCondition(name="trailing_stop", check=check_trailing_stop),
    ExitCondition(name="max_drawdown", check=check_max_drawdown),
    ExitCondition(name="time_exit", check=check_time_exit),
    ExitCondition(name="signal", check=check_exit_signal),
]
