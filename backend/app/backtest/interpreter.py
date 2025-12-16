"""Strategy interpreter: parse blocks and compute signals."""
from dataclasses import dataclass
from typing import Any, Optional

from app.models.candle import Candle
from app.backtest.errors import StrategyInvalidError
from app.backtest import indicators


@dataclass
class StrategySignals:
    """Output of strategy interpretation."""

    entry_long: list[bool]
    exit_long: list[bool]
    position_size_pct: float
    take_profit_pct: Optional[float]
    stop_loss_pct: Optional[float]


def interpret_strategy(
    definition: dict,
    candles: list[Candle],
) -> StrategySignals:
    """
    Parse strategy definition, compute indicators, evaluate logic blocks,
    return entry/exit signals for each candle.
    """
    blocks = definition.get("blocks", [])
    connections = definition.get("connections", [])

    if not blocks:
        raise StrategyInvalidError("Strategy has no blocks", "Invalid strategy: no blocks defined.")

    # Build block lookup
    block_map = {b["id"]: b for b in blocks}

    # Build connection graph: to_block_id -> {port -> from_block_id.port}
    # Handle both old format (from/to) and new format (from_port/to_port)
    input_map: dict[str, dict[str, tuple[str, str]]] = {}
    for conn in connections:
        # Support both old and new format
        from_data = conn.get("from_port") or conn.get("from", {})
        to_data = conn.get("to_port") or conn.get("to", {})

        from_block = from_data.get("block_id")
        from_port = from_data.get("port", "output")
        to_block = to_data.get("block_id")
        to_port = to_data.get("port", "input")

        if to_block not in input_map:
            input_map[to_block] = {}
        input_map[to_block][to_port] = (from_block, from_port)

    # Extract candle data arrays
    n = len(candles)
    opens = [c.open for c in candles]
    highs = [c.high for c in candles]
    lows = [c.low for c in candles]
    closes = [c.close for c in candles]
    volumes = [c.volume for c in candles]

    candle_data = {
        "open": opens,
        "high": highs,
        "low": lows,
        "close": closes,
        "volume": volumes,
    }

    # Compute all block outputs using topological evaluation
    block_outputs: dict[str, dict[str, list[Any]]] = {}

    def get_block_output(block_id: str, port: str = "output") -> list[Any]:
        """Recursively compute block output."""
        if block_id in block_outputs and port in block_outputs[block_id]:
            return block_outputs[block_id][port]

        block = block_map.get(block_id)
        if not block:
            raise StrategyInvalidError(
                f"Block not found: {block_id}",
                "Invalid strategy: missing block reference.",
            )

        block_type = block["type"]
        params = block.get("params", {})

        # Get inputs for this block
        inputs = input_map.get(block_id, {})

        if block_id not in block_outputs:
            block_outputs[block_id] = {}

        # Evaluate based on block type
        if block_type == "price":
            source = params.get("source", "close")
            result = candle_data.get(source, closes)
            block_outputs[block_id]["output"] = result

        elif block_type == "volume":
            block_outputs[block_id]["output"] = volumes

        elif block_type == "constant":
            value = float(params.get("value", 0.0))
            result = [value] * n  # Repeat constant for all candles
            block_outputs[block_id]["output"] = result

        elif block_type == "sma":
            input_data = _get_input(inputs, "input", get_block_output, closes)
            period = int(params.get("period", 20))
            result = indicators.sma(input_data, period)
            block_outputs[block_id]["output"] = result

        elif block_type == "ema":
            input_data = _get_input(inputs, "input", get_block_output, closes)
            period = int(params.get("period", 20))
            result = indicators.ema(input_data, period)
            block_outputs[block_id]["output"] = result

        elif block_type == "rsi":
            input_data = _get_input(inputs, "input", get_block_output, closes)
            period = int(params.get("period", 14))
            result = indicators.rsi(input_data, period)
            block_outputs[block_id]["output"] = result

        elif block_type == "macd":
            input_data = _get_input(inputs, "input", get_block_output, closes)
            fast = int(params.get("fast_period", 12))
            slow = int(params.get("slow_period", 26))
            signal = int(params.get("signal_period", 9))
            macd_line, signal_line, histogram = indicators.macd(input_data, fast, slow, signal)
            block_outputs[block_id]["macd"] = macd_line
            block_outputs[block_id]["signal"] = signal_line
            block_outputs[block_id]["histogram"] = histogram
            block_outputs[block_id]["output"] = macd_line  # Default output

        elif block_type == "bollinger":
            input_data = _get_input(inputs, "input", get_block_output, closes)
            period = int(params.get("period", 20))
            std_dev = float(params.get("stddev", 2.0))
            upper, middle, lower = indicators.bollinger(input_data, period, std_dev)
            block_outputs[block_id]["upper"] = upper
            block_outputs[block_id]["middle"] = middle
            block_outputs[block_id]["lower"] = lower
            block_outputs[block_id]["output"] = middle  # Default output

        elif block_type == "atr":
            period = int(params.get("period", 14))
            result = indicators.atr(highs, lows, closes, period)
            block_outputs[block_id]["output"] = result

        elif block_type == "compare":
            left = _get_input(inputs, "left", get_block_output, [0.0] * n)
            right = _get_input(inputs, "right", get_block_output, [0.0] * n)
            operator = params.get("operator", ">")
            result = _compare(left, right, operator, n)
            block_outputs[block_id]["output"] = result

        elif block_type == "crossover":
            fast = _get_input(inputs, "fast", get_block_output, [0.0] * n)
            slow = _get_input(inputs, "slow", get_block_output, [0.0] * n)
            direction = params.get("direction", "crosses_above")
            result = _crossover(fast, slow, direction, n)
            block_outputs[block_id]["output"] = result

        elif block_type == "and":
            a = _get_input(inputs, "a", get_block_output, [False] * n)
            b = _get_input(inputs, "b", get_block_output, [False] * n)
            result = [_to_bool(av) and _to_bool(bv) for av, bv in zip(a, b)]
            block_outputs[block_id]["output"] = result

        elif block_type == "or":
            a = _get_input(inputs, "a", get_block_output, [False] * n)
            b = _get_input(inputs, "b", get_block_output, [False] * n)
            result = [_to_bool(av) or _to_bool(bv) for av, bv in zip(a, b)]
            block_outputs[block_id]["output"] = result

        elif block_type == "not":
            input_data = _get_input(inputs, "input", get_block_output, [False] * n)
            result = [not _to_bool(v) for v in input_data]
            block_outputs[block_id]["output"] = result

        elif block_type in ("entry_signal", "exit_signal"):
            signal_input = _get_input(inputs, "signal", get_block_output, [False] * n)
            result = [_to_bool(v) for v in signal_input]
            block_outputs[block_id]["output"] = result

        elif block_type in ("position_size", "take_profit", "stop_loss"):
            # Risk blocks don't produce time series output
            block_outputs[block_id]["output"] = [None] * n

        else:
            raise StrategyInvalidError(
                f"Unknown block type: {block_type}",
                f"Invalid strategy: unsupported block type '{block_type}'.",
            )

        return block_outputs[block_id].get(port, block_outputs[block_id].get("output", [None] * n))

    # Find entry and exit signal blocks
    entry_block = None
    exit_block = None
    position_size_pct = 100.0
    take_profit_pct = None
    stop_loss_pct = None

    for block in blocks:
        block_type = block["type"]
        params = block.get("params", {})

        if block_type == "entry_signal":
            entry_block = block["id"]
        elif block_type == "exit_signal":
            exit_block = block["id"]
        elif block_type == "position_size":
            position_size_pct = float(params.get("value", 100))
        elif block_type == "take_profit":
            take_profit_pct = float(params.get("take_profit_pct", 10))
        elif block_type == "stop_loss":
            stop_loss_pct = float(params.get("stop_loss_pct", 5))

    if not entry_block:
        raise StrategyInvalidError("No entry signal block", "Invalid strategy: missing Entry Signal block.")
    if not exit_block:
        raise StrategyInvalidError("No exit signal block", "Invalid strategy: missing Exit Signal block.")

    # Compute entry and exit signals
    entry_signals = get_block_output(entry_block)
    exit_signals = get_block_output(exit_block)

    return StrategySignals(
        entry_long=[_to_bool(v) for v in entry_signals],
        exit_long=[_to_bool(v) for v in exit_signals],
        position_size_pct=position_size_pct,
        take_profit_pct=take_profit_pct,
        stop_loss_pct=stop_loss_pct,
    )


def _get_input(
    inputs: dict[str, tuple[str, str]],
    port: str,
    get_fn: callable,
    default: list[Any],
) -> list[Any]:
    """Get input data for a port, or return default."""
    if port in inputs:
        from_block, from_port = inputs[port]
        return get_fn(from_block, from_port)
    return default


def _to_bool(value: Any) -> bool:
    """Convert value to boolean."""
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return bool(value)


def _compare(
    left: list[Any],
    right: list[Any],
    operator: str,
    n: int,
) -> list[bool]:
    """Compare two series with given operator."""
    result = []
    for i in range(n):
        l_val = left[i] if i < len(left) else None
        r_val = right[i] if i < len(right) else None

        if l_val is None or r_val is None:
            result.append(False)
            continue

        if operator == ">":
            result.append(l_val > r_val)
        elif operator == "<":
            result.append(l_val < r_val)
        elif operator == ">=":
            result.append(l_val >= r_val)
        elif operator == "<=":
            result.append(l_val <= r_val)
        else:
            result.append(False)

    return result


def _crossover(
    fast: list[Any],
    slow: list[Any],
    direction: str,
    n: int,
) -> list[bool]:
    """Detect crossover between two series."""
    result = [False]  # First candle can't have crossover

    for i in range(1, n):
        fast_prev = fast[i - 1] if i - 1 < len(fast) else None
        fast_curr = fast[i] if i < len(fast) else None
        slow_prev = slow[i - 1] if i - 1 < len(slow) else None
        slow_curr = slow[i] if i < len(slow) else None

        if any(v is None for v in [fast_prev, fast_curr, slow_prev, slow_curr]):
            result.append(False)
            continue

        if direction == "crosses_above":
            # Fast was below or equal slow, now above
            crossed = fast_prev <= slow_prev and fast_curr > slow_curr
        else:  # crosses_below
            # Fast was above or equal slow, now below
            crossed = fast_prev >= slow_prev and fast_curr < slow_curr

        result.append(crossed)

    return result
