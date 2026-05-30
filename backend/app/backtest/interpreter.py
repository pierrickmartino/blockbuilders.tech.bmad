"""Strategy interpreter: parse blocks and compute signals."""
from dataclasses import dataclass
from typing import Any, Optional

from app.models.candle import Candle
from app.backtest.errors import StrategyInvalidError
from app.backtest.catalogue import lookup as catalogue_lookup
from app.backtest.catalogue.types import BlockContext
from app.backtest.types import TakeProfitLevel, ValidatedStrategy  # noqa: F401  (re-exported for backward compat)

_ENTRY_SIGNAL_TYPES: frozenset[str] = frozenset({"entry_signal"})
_EXIT_SIGNAL_TYPES: frozenset[str] = frozenset({"exit_signal"})


@dataclass
class StrategySignals:
    """Output of strategy interpretation."""

    entry_long: list[bool]
    exit_long: list[bool]
    position_size_pct: float
    take_profit_levels: Optional[list[TakeProfitLevel]]
    stop_loss_pct: Optional[float]
    max_drawdown_pct: Optional[float]
    time_exit_bars: Optional[int] = None
    trailing_stop_pct: Optional[float] = None


def interpret_strategy(
    strategy: ValidatedStrategy,
    candles: list[Candle],
) -> StrategySignals:
    """
    Compute indicators and evaluate logic blocks from a pre-validated strategy,
    returning entry/exit signals for each candle.
    """
    blocks = strategy.blocks
    connections = strategy.connections

    if not blocks:
        raise StrategyInvalidError("Strategy has no blocks", "Invalid strategy: no blocks defined.")

    # Build block lookup
    block_map = {b["id"]: b for b in blocks}

    # Build connection graph: to_block_id -> {port -> (from_block_id, from_port)}
    # Connections are already normalized to from_port/to_port format.
    input_map: dict[str, dict[str, tuple[str, str]]] = {}
    for conn in connections:
        from_block = conn["from_port"]["block_id"]
        from_port = conn["from_port"]["port"]
        to_block = conn["to_port"]["block_id"]
        to_port = conn["to_port"]["port"]

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
        if (catalogue_handler := catalogue_lookup(block_type)) is not None:
            resolved_inputs = {
                port: get_block_output(*src)
                for port, src in inputs.items()
            }
            ctx = BlockContext(candle_data=candle_data, params=params, inputs=resolved_inputs, n=n)
            block_outputs[block_id] = catalogue_handler.compute(ctx)

        elif block_type in ("position_size", "take_profit", "stop_loss", "max_drawdown", "time_exit", "trailing_stop"):
            # Risk blocks don't produce time series output
            block_outputs[block_id]["output"] = [None] * n

        else:
            raise StrategyInvalidError(
                f"Unknown block type: {block_type}",
                f"Invalid strategy: unsupported block type '{block_type}'.",
            )

        return block_outputs[block_id].get(port, block_outputs[block_id].get("output", [None] * n))

    # Find entry and exit signal blocks
    entry_blocks = []
    exit_blocks = []
    for block in blocks:
        block_type = block["type"]
        if block_type in _ENTRY_SIGNAL_TYPES:
            entry_blocks.append(block["id"])
        elif block_type in _EXIT_SIGNAL_TYPES:
            exit_blocks.append(block["id"])

    # Read risk parameters from pre-extracted ValidatedStrategy risk_params
    risk = strategy.risk_params
    position_size_pct = risk.position_size_pct
    take_profit_levels: Optional[list[TakeProfitLevel]] = (
        list(risk.take_profit_levels) if risk.take_profit_levels else None
    )
    stop_loss_pct = risk.stop_loss_pct
    max_drawdown_pct = risk.max_drawdown_pct
    time_exit_bars = risk.time_exit_bars
    trailing_stop_pct = risk.trailing_stop_pct

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


def _to_bool(value: Any) -> bool:
    """Convert value to boolean."""
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return bool(value)
