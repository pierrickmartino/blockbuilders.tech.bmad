"""DrafterVocabulary — projects the Block Catalogue into the Strategy
drafter's vocabulary (ADR-0011).

Pure, zero I/O. Two projections of the same set — the Block Catalogue
*union* the six inline risk/exit blocks (`position_size`, `take_profit`,
`stop_loss`, `max_drawdown`, `time_exit`, `trailing_stop`). Those risk
blocks are deliberately out of catalogue scope (CONTEXT.md), but they are
the usual way to satisfy the Strategy validator's "must have an exit" rule,
so omitting them would make most drafts fail validation:

- `vocabulary_block_types()` — the IR schema's block-type enum
  (`app.schemas.strategy_draft_ir.BlockType`).
- `vocabulary_param_specs(block_type)` — per-type `ParamSpec`s, used to
  render the prompt vocabulary's param shapes.
- `render_prompt_vocabulary()` — a compact prompt vocabulary (labels +
  one-line "what it does / when to use" + param shapes) for the same union.

A new block becomes draftable purely by being added to `CATALOGUE` — no
change here is required.
"""
from __future__ import annotations

from app.backtest.catalogue import CATALOGUE
from app.backtest.catalogue.types import BlockSpec, ParamSpec

# The six inline risk/exit blocks (CONTEXT.md): out of catalogue scope, but
# part of the drafter's vocabulary. Bounds mirror
# services/strategy_validation.py's validate_block_params.
RISK_BLOCK_SPECS: dict[str, BlockSpec] = {
    "position_size": BlockSpec(
        type="position_size",
        category="risk",
        label="Position Size",
        inputs=(),
        outputs=(),
        params=(ParamSpec(name="value", label="Value", kind="float", default=100.0, min=1, max=100),),
    ),
    "stop_loss": BlockSpec(
        type="stop_loss",
        category="risk",
        label="Stop Loss",
        inputs=(),
        outputs=(),
        params=(
            ParamSpec(name="stop_loss_pct", label="Stop Loss %", kind="float", default=5.0, min=0.1, max=100),
        ),
    ),
    "take_profit": BlockSpec(
        type="take_profit",
        category="risk",
        label="Take Profit",
        inputs=(),
        outputs=(),
        params=(
            ParamSpec(name="take_profit_pct", label="Take Profit %", kind="float", default=10.0, min=0.1, max=100),
        ),
    ),
    "trailing_stop": BlockSpec(
        type="trailing_stop",
        category="risk",
        label="Trailing Stop",
        inputs=(),
        outputs=(),
        params=(ParamSpec(name="trail_pct", label="Trail %", kind="float", default=5.0, min=0.1, max=100),),
    ),
    "time_exit": BlockSpec(
        type="time_exit",
        category="risk",
        label="Time Exit",
        inputs=(),
        outputs=(),
        params=(ParamSpec(name="bars", label="Bars", kind="int", default=10, min=1),),
    ),
    "max_drawdown": BlockSpec(
        type="max_drawdown",
        category="risk",
        label="Max Drawdown",
        inputs=(),
        outputs=(),
        params=(
            ParamSpec(name="max_drawdown_pct", label="Max Drawdown %", kind="float", default=20.0, min=0.1, max=100),
        ),
    ),
}

# One-line "what it does / when to use" descriptions for the prompt
# vocabulary. A block without an entry here (e.g. a newly-catalogued block)
# falls back to `_fallback_description` so it remains draftable.
_DESCRIPTIONS: dict[str, str] = {
    # ── input ──
    "constant": "A fixed numeric value. Use as a comparison threshold or fixed parameter input.",
    "price": "The OHLCV price series for the selected source. Use as input to indicators or comparisons.",
    "volume": "The candle's traded volume. Use to gate signals on volume conditions.",
    "yesterday_close": "Yesterday's close price. Use to compare today's price action against the prior close.",
    # ── indicator ──
    "adx": "Average Directional Index — measures trend strength and direction (+DI/-DI). Use to filter trending vs ranging markets.",
    "atr": "Average True Range — measures recent volatility. Use to size stops or filter for volatile conditions.",
    "bollinger": "Bollinger Bands — a moving average with volatility bands. Use to detect overbought/oversold extremes or breakouts.",
    "ema": "Exponential Moving Average — a trend-following average weighted toward recent prices. Use for trend direction or crossovers.",
    "fibonacci": "Fibonacci retracement levels over a lookback window. Use to spot potential support/resistance levels.",
    "ichimoku": "Ichimoku Cloud — a multi-line trend/momentum indicator. Use for trend direction and support/resistance via the cloud.",
    "macd": "Moving Average Convergence Divergence — a trend-following momentum indicator with signal-line crossovers. Use to spot momentum shifts.",
    "obv": "On-Balance Volume — cumulative volume flow. Use to confirm price trends with volume.",
    "price_variation_pct": "Percent change of close price from the previous candle. Use to detect sudden price moves.",
    "rsi": "Relative Strength Index — a 0-100 momentum oscillator. Use to detect overbought (>70) or oversold (<30) conditions.",
    "sma": "Simple Moving Average — the average price over a period. Use for trend direction or crossovers.",
    "stochastic": "Stochastic Oscillator — compares the close to its recent range. Use to detect overbought/oversold conditions.",
    # ── logic ──
    "and": "Logical AND of two boolean inputs. Use to require multiple conditions at once.",
    "compare": "Compares two numeric inputs with an operator (>, <, >=, <=). Use to turn indicator values into a boolean condition.",
    "crossover": "Detects when one series crosses above or below another. Use for crossover-based entry/exit signals.",
    "not": "Logical negation of a boolean input. Use to invert a condition.",
    "or": "Logical OR of two boolean inputs. Use to allow any of multiple conditions.",
    # ── signal ──
    "entry_signal": "Marks a boolean condition as the strategy's entry trigger. At least one is required to enter a position.",
    "exit_signal": "Marks a boolean condition as the strategy's exit trigger. Optional if a risk block provides the exit.",
    # ── risk (inline, out of catalogue scope) ──
    "position_size": "Sets the % of portfolio allocated per trade. Use to size positions.",
    "stop_loss": "Closes the position if losses exceed a percentage. Use to cap downside risk.",
    "take_profit": "Closes the position once it gains a percentage. Use to lock in profit.",
    "trailing_stop": "Closes the position if price retraces a percentage from its peak. Use to protect gains while letting winners run.",
    "time_exit": "Closes the position after a fixed number of bars. Use for time-boxed strategies.",
    "max_drawdown": "Closes the position if the strategy's drawdown exceeds a percentage. Use as a portfolio-level circuit breaker.",
}


def _fallback_description(spec: BlockSpec) -> str:
    return f"{spec.label} ({spec.category} block)."


def _all_specs() -> dict[str, BlockSpec]:
    """The drafter's vocabulary: catalogue blocks ∪ inline risk blocks."""
    specs: dict[str, BlockSpec] = {block_type: handler.spec for block_type, handler in CATALOGUE.items()}
    specs.update(RISK_BLOCK_SPECS)
    return specs


def vocabulary_block_types() -> tuple[str, ...]:
    """The drafter's vocabulary, sorted by (category, type)."""
    specs = _all_specs()
    return tuple(sorted(specs, key=lambda block_type: (specs[block_type].category, block_type)))


def vocabulary_spec(block_type: str) -> BlockSpec | None:
    """The `BlockSpec` for `block_type`, or `None` if it is not in the vocabulary."""
    return _all_specs().get(block_type)


def vocabulary_param_specs(block_type: str) -> tuple[ParamSpec, ...]:
    """The `ParamSpec`s for `block_type`, or `()` if it is not in the vocabulary."""
    spec = vocabulary_spec(block_type)
    return spec.params if spec is not None else ()


def vocabulary_description(block_type: str) -> str:
    """The one-line "what it does / when to use" description for `block_type`."""
    spec = _all_specs()[block_type]
    return _DESCRIPTIONS.get(block_type, _fallback_description(spec))


def _render_param(param: ParamSpec) -> str:
    if param.kind == "enum":
        return f"{param.name}: enum[{','.join(param.options)}] (default {param.default})"
    if param.min is not None and param.max is not None:
        return f"{param.name}: {param.kind} {param.min}-{param.max} (default {param.default})"
    if param.min is not None:
        return f"{param.name}: {param.kind} >= {param.min} (default {param.default})"
    return f"{param.name}: {param.kind} (default {param.default})"


def render_prompt_vocabulary() -> str:
    """A compact prompt vocabulary: one line per block, grouped by category."""
    specs = _all_specs()
    lines: list[str] = []
    current_category: str | None = None
    for block_type in vocabulary_block_types():
        spec = specs[block_type]
        if spec.category != current_category:
            current_category = spec.category
            lines.append(f"\n{current_category.title()} blocks:")
        params = ", ".join(_render_param(p) for p in spec.params) or "none"
        lines.append(f"- {block_type} ({spec.label}): {vocabulary_description(block_type)} Params: {params}.")
    return "\n".join(lines).strip()
