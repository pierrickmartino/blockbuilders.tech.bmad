"""Trade explanation builder for backtest results.

Parses strategy definitions to generate human-readable explanations
of why trades entered and exited.
"""
from typing import Optional
from app.models.candle import Candle
from app.backtest import indicators
from app.schemas.backtest import (
    EntryExplanation,
    ExitExplanation,
    IndicatorSeries,
)


# Color mapping for indicator overlays
INDICATOR_COLORS = {
    "sma": "#3b82f6",  # blue
    "ema": "#f97316",  # orange
    "bollinger": "#8b5cf6",  # purple
    "atr": "#10b981",  # green
    "stochastic": "#ec4899",  # pink
    "adx": "#f59e0b",  # amber
}


def build_trade_explanation(
    definition: dict,
    candles: list[Candle],
    trade_entry_idx: int,
    trade_exit_idx: int,
    exit_reason: str,
    sl_price: Optional[float],
    tp_price: Optional[float],
) -> tuple[EntryExplanation, ExitExplanation, list[IndicatorSeries]]:
    """
    Build explanation data for a single trade.

    Args:
        definition: Strategy definition JSON with blocks and connections
        candles: Candle window around the trade
        trade_entry_idx: Index in candles where trade entered
        trade_exit_idx: Index in candles where trade exited
        exit_reason: Exit reason code ("tp", "sl", "signal", etc.)
        sl_price: Stop loss price at entry
        tp_price: Take profit price at entry

    Returns:
        Tuple of (entry_explanation, exit_explanation, indicator_series)
    """
    blocks = definition.get("blocks", [])
    connections = definition.get("connections", [])

    if not blocks:
        # Fallback for empty strategy
        return (
            EntryExplanation(
                summary="Entry triggered by strategy logic",
                conditions=[]
            ),
            _build_exit_explanation(exit_reason, sl_price, tp_price),
            []
        )

    # Build block lookup and connection map
    block_map = {b["id"]: b for b in blocks}
    input_map = _build_input_map(connections)

    # Find entry signal blocks
    entry_blocks = [b for b in blocks if b["type"] == "entry_signal"]

    # Build entry explanation
    if entry_blocks:
        entry_conditions = []
        for entry_block in entry_blocks:
            conditions = _extract_conditions(entry_block["id"], block_map, input_map)
            entry_conditions.extend(conditions)

        # Create summary
        if len(entry_conditions) == 0:
            summary = "Entry signal triggered"
        elif len(entry_conditions) == 1:
            summary = f"Entry: {entry_conditions[0]}"
        elif len(entry_blocks) > 1:
            summary = f"Entry triggered by one of {len(entry_blocks)} conditions"
        else:
            summary = f"Entry: {' AND '.join(entry_conditions)}"

        entry_explanation = EntryExplanation(
            summary=summary,
            conditions=[f"{cond} ✓" for cond in entry_conditions]
        )
    else:
        entry_explanation = EntryExplanation(
            summary="Entry triggered by strategy logic",
            conditions=[]
        )

    # Build exit explanation
    exit_explanation = _build_exit_explanation(exit_reason, sl_price, tp_price)

    # Compute indicator series for chart overlays
    indicator_series = _compute_indicator_series(definition, candles)

    return entry_explanation, exit_explanation, indicator_series


def _build_input_map(connections: list[dict]) -> dict[str, dict[str, tuple[str, str]]]:
    """Build connection map: to_block_id -> {port -> (from_block_id, from_port)}."""
    input_map: dict[str, dict[str, tuple[str, str]]] = {}

    for conn in connections:
        # Support both old format (from/to) and new format (from_port/to_port)
        from_data = conn.get("from_port") or conn.get("from", {})
        to_data = conn.get("to_port") or conn.get("to", {})

        from_block = from_data.get("block_id")
        from_port = from_data.get("port", "output")
        to_block = to_data.get("block_id")
        to_port = to_data.get("port", "input")

        if to_block not in input_map:
            input_map[to_block] = {}
        input_map[to_block][to_port] = (from_block, from_port)

    return input_map


def _extract_conditions(
    block_id: str,
    block_map: dict[str, dict],
    input_map: dict[str, dict[str, tuple[str, str]]]
) -> list[str]:
    """
    Walk backward from a block to extract condition labels.

    Returns list of human-readable condition strings.
    """
    block = block_map.get(block_id)
    if not block:
        return []

    block_type = block["type"]

    # If this is a signal block, get its input
    if block_type in ("entry_signal", "exit_signal"):
        inputs = input_map.get(block_id, {})
        signal_input = inputs.get("signal")
        if signal_input:
            from_block_id, _ = signal_input
            return _extract_conditions(from_block_id, block_map, input_map)
        return []

    # If this is a logic block, recursively extract conditions
    if block_type == "and":
        inputs = input_map.get(block_id, {})
        left_conditions = []
        right_conditions = []

        left_input = inputs.get("a")
        if left_input:
            from_block_id, _ = left_input
            left_conditions = _extract_conditions(from_block_id, block_map, input_map)

        right_input = inputs.get("b")
        if right_input:
            from_block_id, _ = right_input
            right_conditions = _extract_conditions(from_block_id, block_map, input_map)

        return left_conditions + right_conditions

    if block_type == "or":
        inputs = input_map.get(block_id, {})
        left_conditions = []
        right_conditions = []

        left_input = inputs.get("a")
        if left_input:
            from_block_id, _ = left_input
            left_conditions = _extract_conditions(from_block_id, block_map, input_map)

        right_input = inputs.get("b")
        if right_input:
            from_block_id, _ = right_input
            right_conditions = _extract_conditions(from_block_id, block_map, input_map)

        # For OR, show as separate possibilities
        return left_conditions + right_conditions

    if block_type == "not":
        inputs = input_map.get(block_id, {})
        input_conn = inputs.get("input")
        if input_conn:
            from_block_id, _ = input_conn
            conditions = _extract_conditions(from_block_id, block_map, input_map)
            return [f"NOT ({cond})" for cond in conditions]
        return []

    # For leaf blocks (compare, crossover, indicators), generate label
    label = _generate_condition_label(block, block_map, input_map)
    return [label] if label else []


def _generate_condition_label(
    block: dict,
    block_map: dict[str, dict],
    input_map: dict[str, dict[str, tuple[str, str]]]
) -> str:
    """Generate human-readable label for a block."""
    block_type = block["type"]
    params = block.get("params", {})
    block_id = block["id"]

    if block_type == "compare":
        # Get left and right inputs
        inputs = input_map.get(block_id, {})
        left_label = _get_input_label(inputs.get("left") or inputs.get("a"), block_map, input_map)
        right_label = _get_input_label(inputs.get("right") or inputs.get("b"), block_map, input_map)
        operator = params.get("operator", ">")

        # Map operators to symbols
        op_map = {
            ">": ">",
            "<": "<",
            ">=": "≥",
            "<=": "≤",
            "==": "=",
            "!=": "≠"
        }
        op_symbol = op_map.get(operator, operator)

        return f"{left_label} {op_symbol} {right_label}"

    if block_type == "crossover":
        inputs = input_map.get(block_id, {})
        fast_label = _get_input_label(inputs.get("fast"), block_map, input_map)
        slow_label = _get_input_label(inputs.get("slow"), block_map, input_map)
        direction = params.get("direction", "crosses_above")

        if direction == "crosses_above":
            return f"{fast_label} crossed above {slow_label}"
        else:
            return f"{fast_label} crossed below {slow_label}"

    # For indicators and other blocks, use block label if available
    return block.get("label", block_type.upper())


def _get_input_label(
    input_conn: Optional[tuple[str, str]],
    block_map: dict[str, dict],
    input_map: dict[str, dict[str, tuple[str, str]]]
) -> str:
    """Get label for an input connection."""
    if not input_conn:
        return "value"

    from_block_id, from_port = input_conn
    from_block = block_map.get(from_block_id)
    if not from_block:
        return "value"

    from_type = from_block["type"]
    from_params = from_block.get("params", {})

    # Indicator blocks
    if from_type == "sma":
        period = from_params.get("period", 20)
        return f"SMA({period})"
    if from_type == "ema":
        period = from_params.get("period", 20)
        return f"EMA({period})"
    if from_type == "rsi":
        period = from_params.get("period", 14)
        return f"RSI({period})"
    if from_type == "macd":
        if from_port == "signal":
            return "MACD Signal"
        if from_port == "histogram":
            return "MACD Histogram"
        return "MACD"
    if from_type == "bollinger":
        period = from_params.get("period", 20)
        if from_port == "upper":
            return f"BB Upper({period})"
        if from_port == "lower":
            return f"BB Lower({period})"
        return f"BB Middle({period})"
    if from_type == "atr":
        period = from_params.get("period", 14)
        return f"ATR({period})"
    if from_type == "stochastic":
        if from_port == "k":
            return "Stoch %K"
        if from_port == "d":
            return "Stoch %D"
        return "Stochastic"
    if from_type == "adx":
        period = from_params.get("period", 14)
        return f"ADX({period})"

    # Input blocks
    if from_type == "price":
        source = from_params.get("source", "close")
        return source.capitalize()
    if from_type == "constant":
        value = from_params.get("value", 0)
        return str(value)
    if from_type == "volume":
        return "Volume"
    if from_type == "yesterday_close":
        return "Yesterday Close"
    if from_type == "price_variation_pct":
        return "Price Change %"

    # Use block label or type as fallback
    return from_block.get("label", from_type.upper())


def _build_exit_explanation(
    exit_reason: str,
    sl_price: Optional[float],
    tp_price: Optional[float]
) -> ExitExplanation:
    """Generate exit explanation from exit reason code."""
    details = {}

    if exit_reason == "tp":
        summary = f"Take profit hit at {tp_price:.2f}" if tp_price else "Take profit triggered"
        if tp_price:
            details["tp_price"] = tp_price
    elif exit_reason == "sl":
        summary = f"Stop loss hit at {sl_price:.2f}" if sl_price else "Stop loss triggered"
        if sl_price:
            details["sl_price"] = sl_price
    elif exit_reason == "signal":
        summary = "Exit signal triggered"
    elif exit_reason == "end_of_data":
        summary = "Backtest period ended"
    elif exit_reason == "trailing_stop":
        summary = "Trailing stop triggered"
    elif exit_reason == "time_exit":
        summary = "Time exit: maximum hold duration reached"
    elif exit_reason == "max_drawdown":
        summary = "Max drawdown threshold hit"
    else:
        summary = f"Exit: {exit_reason}"

    return ExitExplanation(
        summary=summary,
        reason_type=exit_reason,
        details=details if details else None
    )


def _compute_indicator_series(
    definition: dict,
    candles: list[Candle]
) -> list[IndicatorSeries]:
    """
    Recompute all indicators used in strategy for chart overlays.

    Only returns price-pane indicators (SMA, EMA, Bollinger Bands).
    Subplot indicators (RSI, MACD, etc.) are deferred to Phase 2.
    """
    blocks = definition.get("blocks", [])
    closes = [c.close for c in candles]
    highs = [c.high for c in candles]
    lows = [c.low for c in candles]

    indicator_series = []

    for block in blocks:
        block_type = block["type"]
        params = block.get("params", {})

        try:
            if block_type == "sma":
                period = int(params.get("period", 20))
                source = params.get("source", "close")
                if source == "close":
                    data = closes
                elif source == "high":
                    data = highs
                elif source == "low":
                    data = lows
                else:
                    data = closes

                series_data = indicators.sma(data, period)
                indicator_series.append(IndicatorSeries(
                    indicator_type="sma",
                    label=f"SMA({period})",
                    series_data=series_data,
                    plot_type="line",
                    subplot=False,
                    color=INDICATOR_COLORS.get("sma")
                ))

            elif block_type == "ema":
                period = int(params.get("period", 20))
                source = params.get("source", "close")
                if source == "close":
                    data = closes
                elif source == "high":
                    data = highs
                elif source == "low":
                    data = lows
                else:
                    data = closes

                series_data = indicators.ema(data, period)
                indicator_series.append(IndicatorSeries(
                    indicator_type="ema",
                    label=f"EMA({period})",
                    series_data=series_data,
                    plot_type="line",
                    subplot=False,
                    color=INDICATOR_COLORS.get("ema")
                ))

            elif block_type == "bollinger":
                period = int(params.get("period", 20))
                std_dev = float(params.get("std_dev", 2.0))
                upper, middle, lower = indicators.bollinger(closes, period, std_dev)

                indicator_series.extend([
                    IndicatorSeries(
                        indicator_type="bollinger",
                        label=f"BB Upper({period})",
                        series_data=upper,
                        plot_type="line",
                        subplot=False,
                        color=INDICATOR_COLORS.get("bollinger"),
                        port="upper"
                    ),
                    IndicatorSeries(
                        indicator_type="bollinger",
                        label=f"BB Middle({period})",
                        series_data=middle,
                        plot_type="line",
                        subplot=False,
                        color=INDICATOR_COLORS.get("bollinger"),
                        port="middle"
                    ),
                    IndicatorSeries(
                        indicator_type="bollinger",
                        label=f"BB Lower({period})",
                        series_data=lower,
                        plot_type="line",
                        subplot=False,
                        color=INDICATOR_COLORS.get("bollinger"),
                        port="lower"
                    )
                ])

            # Skip subplot indicators (RSI, MACD, etc.) for Phase 1
            # These will be added in Phase 2 with proper subplot support

        except Exception:
            # If indicator computation fails, skip it
            continue

    return indicator_series
