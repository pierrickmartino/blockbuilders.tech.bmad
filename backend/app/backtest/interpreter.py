"""Strategy interpreter: parse blocks and compute signals."""
from dataclasses import dataclass
from typing import Any, Optional

from app.models.candle import Candle
from app.backtest.errors import StrategyInvalidError
from app.backtest import indicators


@dataclass
class TakeProfitLevel:
    """A single take profit level."""
    profit_pct: float
    close_pct: int


@dataclass
class StrategySignals:
    """Output of strategy interpretation."""

    entry_long: list[bool]
    exit_long: list[bool]
    position_size_pct: float
    take_profit_levels: Optional[list[TakeProfitLevel]]  # New: TP ladder
    stop_loss_pct: Optional[float]
    max_drawdown_pct: Optional[float]  # New: Max drawdown threshold
    time_exit_bars: Optional[int] = None  # New: Time exit after N bars
    trailing_stop_pct: Optional[float] = None  # New: Trailing stop percentage


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

    # Previous close: None for first candle, then close[t-1]
    prev_closes = [None] + closes[:-1]

    candle_data = {
        "open": opens,
        "high": highs,
        "low": lows,
        "close": closes,
        "prev_close": prev_closes,
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

        elif block_type == "yesterday_close":
            # Previous candle close: null for first candle, then close[t-1]
            result = [None] + closes[:-1]
            block_outputs[block_id]["output"] = result

        elif block_type == "sma":
            # Get price source from params (defaults to close for backward compatibility)
            source = params.get("source", "close")
            input_data = candle_data.get(source, closes)
            period = int(params.get("period", 20))
            result = indicators.sma(input_data, period)
            block_outputs[block_id]["output"] = result

        elif block_type == "ema":
            # Get price source from params (defaults to close for backward compatibility)
            source = params.get("source", "close")
            input_data = candle_data.get(source, closes)
            period = int(params.get("period", 20))
            result = indicators.ema(input_data, period)
            block_outputs[block_id]["output"] = result

        elif block_type == "rsi":
            # Get price source from params (defaults to close for backward compatibility)
            source = params.get("source", "close")
            input_data = candle_data.get(source, closes)
            period = int(params.get("period", 14))
            result = indicators.rsi(input_data, period)
            block_outputs[block_id]["output"] = result

        elif block_type == "macd":
            # Get price source from params (defaults to close for backward compatibility)
            source = params.get("source", "close")
            input_data = candle_data.get(source, closes)
            fast = int(params.get("fast_period", 12))
            slow = int(params.get("slow_period", 26))
            signal = int(params.get("signal_period", 9))
            macd_line, signal_line, histogram = indicators.macd(input_data, fast, slow, signal)
            block_outputs[block_id]["macd"] = macd_line
            block_outputs[block_id]["signal"] = signal_line
            block_outputs[block_id]["histogram"] = histogram
            block_outputs[block_id]["output"] = macd_line  # Default output

        elif block_type == "bollinger":
            # Get price source from params (defaults to close for backward compatibility)
            source = params.get("source", "close")
            input_data = candle_data.get(source, closes)
            period = int(params.get("period", 20))
            std_dev = float(params.get("stddev", 2.0))
            upper, middle, lower = indicators.bollinger(input_data, period, std_dev)
            block_outputs[block_id]["upper"] = upper
            block_outputs[block_id]["middle"] = middle
            block_outputs[block_id]["lower"] = lower
            block_outputs[block_id]["output"] = middle  # Default output

        elif block_type == "atr":
            # ATR uses high/low/close internally - no source selection
            period = int(params.get("period", 14))
            result = indicators.atr(highs, lows, closes, period)
            block_outputs[block_id]["output"] = result

        elif block_type == "stochastic":
            k_period = int(params.get("k_period", 14))
            d_period = int(params.get("d_period", 3))
            smooth = int(params.get("smooth", 3))
            k_line, d_line = indicators.stochastic(highs, lows, closes, k_period, d_period, smooth)
            block_outputs[block_id]["k"] = k_line
            block_outputs[block_id]["d"] = d_line
            block_outputs[block_id]["output"] = k_line  # Default output

        elif block_type == "adx":
            period = int(params.get("period", 14))
            adx_line, plus_di, minus_di = indicators.adx(highs, lows, closes, period)
            block_outputs[block_id]["adx"] = adx_line
            block_outputs[block_id]["plus_di"] = plus_di
            block_outputs[block_id]["minus_di"] = minus_di
            block_outputs[block_id]["output"] = adx_line  # Default output

        elif block_type == "ichimoku":
            conversion = int(params.get("conversion", 9))
            base = int(params.get("base", 26))
            span_b = int(params.get("span_b", 52))
            displacement = int(params.get("displacement", 26))
            conv_line, base_line, span_a, span_b_line = indicators.ichimoku(
                highs, lows, closes, conversion, base, span_b, displacement
            )
            block_outputs[block_id]["conversion"] = conv_line
            block_outputs[block_id]["base"] = base_line
            block_outputs[block_id]["span_a"] = span_a
            block_outputs[block_id]["span_b"] = span_b_line
            block_outputs[block_id]["output"] = conv_line  # Default output

        elif block_type == "obv":
            result = indicators.obv(closes, volumes)
            block_outputs[block_id]["output"] = result

        elif block_type == "fibonacci":
            lookback = int(params.get("lookback", 50))
            level_236, level_382, level_5, level_618, level_786 = indicators.fibonacci_retracements(
                highs, lows, lookback
            )
            block_outputs[block_id]["level_236"] = level_236
            block_outputs[block_id]["level_382"] = level_382
            block_outputs[block_id]["level_5"] = level_5
            block_outputs[block_id]["level_618"] = level_618
            block_outputs[block_id]["level_786"] = level_786
            block_outputs[block_id]["output"] = level_5  # Default to 0.5 level

        elif block_type == "price_variation_pct":
            result = indicators.price_variation_pct(closes)
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

        elif block_type in ("position_size", "take_profit", "stop_loss", "max_drawdown", "time_exit", "trailing_stop"):
            # Risk blocks don't produce time series output
            block_outputs[block_id]["output"] = [None] * n

        else:
            raise StrategyInvalidError(
                f"Unknown block type: {block_type}",
                f"Invalid strategy: unsupported block type '{block_type}'.",
            )

        return block_outputs[block_id].get(port, block_outputs[block_id].get("output", [None] * n))

    # Find entry and exit signal blocks (support multiple)
    entry_blocks = []
    exit_blocks = []
    position_size_pct = 100.0
    take_profit_levels: Optional[list[TakeProfitLevel]] = None
    stop_loss_pct = None
    max_drawdown_pct = None
    time_exit_bars: Optional[int] = None
    trailing_stop_pct: Optional[float] = None

    for block in blocks:
        block_type = block["type"]
        params = block.get("params", {})

        if block_type == "entry_signal":
            entry_blocks.append(block["id"])
        elif block_type == "exit_signal":
            exit_blocks.append(block["id"])
        elif block_type == "position_size":
            position_size_pct = float(params.get("value", 100))
        elif block_type == "take_profit":
            # Support both new levels format and legacy take_profit_pct
            if "levels" in params and isinstance(params["levels"], list):
                take_profit_levels = [
                    TakeProfitLevel(
                        profit_pct=float(lvl.get("profit_pct", 10)),
                        close_pct=int(lvl.get("close_pct", 100))
                    )
                    for lvl in params["levels"]
                ]
            elif "take_profit_pct" in params:
                # Legacy format: single TP level with 100% close
                take_profit_levels = [
                    TakeProfitLevel(
                        profit_pct=float(params.get("take_profit_pct", 10)),
                        close_pct=100
                    )
                ]
            else:
                # Default
                take_profit_levels = [TakeProfitLevel(profit_pct=10.0, close_pct=100)]
        elif block_type == "stop_loss":
            stop_loss_pct = float(params.get("stop_loss_pct", 5))
        elif block_type == "max_drawdown":
            max_drawdown_pct = float(params.get("max_drawdown_pct", 10))
        elif block_type == "time_exit":
            time_exit_bars = int(params.get("bars", 10))
        elif block_type == "trailing_stop":
            trailing_stop_pct = float(params.get("trail_pct", 5))

    # Compute OR of all entry signals
    entry_signals_list = [get_block_output(block_id) for block_id in entry_blocks]
    entry_signals = [False] * n
    if entry_signals_list:
        for i in range(n):
            entry_signals[i] = any(_to_bool(signals[i]) for signals in entry_signals_list)

    # Compute OR of all exit signals
    exit_signals_list = [get_block_output(block_id) for block_id in exit_blocks]
    exit_signals = [False] * n
    if exit_signals_list:
        for i in range(n):
            exit_signals[i] = any(_to_bool(signals[i]) for signals in exit_signals_list)

    return StrategySignals(
        entry_long=entry_signals,
        exit_long=exit_signals,
        position_size_pct=position_size_pct,
        take_profit_levels=take_profit_levels,
        stop_loss_pct=stop_loss_pct,
        max_drawdown_pct=max_drawdown_pct,
        time_exit_bars=time_exit_bars,
        trailing_stop_pct=trailing_stop_pct,
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
