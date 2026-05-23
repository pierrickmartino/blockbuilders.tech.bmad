"""Tests for blocks migrated in issue #419: signal blocks.

Covers: entry_signal, exit_signal.
Both are pass-through blocks that coerce a boolean input series into a clean
signal output.  No candle_data access, no params.
"""
from __future__ import annotations

from typing import Any


# ── helpers ───────────────────────────────────────────────────────────────────

def _ctx(inputs: dict[str, list], params: dict | None = None) -> Any:
    from app.backtest.catalogue.types import BlockContext

    n = max((len(v) for v in inputs.values()), default=3)
    candle_data: dict[str, list] = {}
    return BlockContext(candle_data=candle_data, params=params or {}, inputs=inputs, n=n)


def _ctx_n(n: int) -> Any:
    """Empty-input context with explicit n (for default-input tests)."""
    from app.backtest.catalogue.types import BlockContext

    return BlockContext(candle_data={}, params={}, inputs={}, n=n)


# ── entry_signal ──────────────────────────────────────────────────────────────

class TestEntrySignalHandler:
    def _handler(self):
        from app.backtest.catalogue.signal.entry_signal import EntrySignalHandler
        return EntrySignalHandler()

    def test_spec_type(self):
        assert self._handler().spec.type == "entry_signal"

    def test_spec_category(self):
        assert self._handler().spec.category == "signal"

    def test_spec_has_signal_input_port(self):
        names = {p.name for p in self._handler().spec.inputs}
        assert "signal" in names

    def test_spec_has_output_port(self):
        names = {p.name for p in self._handler().spec.outputs}
        assert "output" in names

    def test_spec_has_no_params(self):
        assert self._handler().spec.params == ()

    def test_compute_true_values_pass_through(self):
        h = self._handler()
        ctx = _ctx({"signal": [True, True, True]})
        assert h.compute(ctx)["output"] == [True, True, True]

    def test_compute_false_values_pass_through(self):
        h = self._handler()
        ctx = _ctx({"signal": [False, False, False]})
        assert h.compute(ctx)["output"] == [False, False, False]

    def test_compute_mixed_booleans(self):
        h = self._handler()
        ctx = _ctx({"signal": [True, False, True, False]})
        assert h.compute(ctx)["output"] == [True, False, True, False]

    def test_compute_numeric_truthy_coerced(self):
        h = self._handler()
        ctx = _ctx({"signal": [1.0, 0.0, 2.5, -1.0]})
        assert h.compute(ctx)["output"] == [True, False, True, True]

    def test_compute_zero_is_false(self):
        h = self._handler()
        ctx = _ctx({"signal": [0, 0.0]})
        assert h.compute(ctx)["output"] == [False, False]

    def test_compute_none_is_false(self):
        h = self._handler()
        ctx = _ctx({"signal": [None, True, None]})
        assert h.compute(ctx)["output"] == [False, True, False]

    def test_compute_no_input_defaults_to_false(self):
        """When no signal connection exists, output must be all-False."""
        h = self._handler()
        ctx = _ctx_n(4)
        result = h.compute(ctx)
        assert result["output"] == [False, False, False, False]

    def test_validate_always_returns_empty(self):
        assert self._handler().validate({}) == []

    def test_does_not_read_candle_data(self):
        from app.backtest.catalogue.types import BlockContext

        ctx = BlockContext(candle_data={}, params={}, inputs={"signal": [True, False]}, n=2)
        result = self._handler().compute(ctx)
        assert result["output"] == [True, False]


# ── exit_signal ───────────────────────────────────────────────────────────────

class TestExitSignalHandler:
    def _handler(self):
        from app.backtest.catalogue.signal.exit_signal import ExitSignalHandler
        return ExitSignalHandler()

    def test_spec_type(self):
        assert self._handler().spec.type == "exit_signal"

    def test_spec_category(self):
        assert self._handler().spec.category == "signal"

    def test_spec_has_signal_input_port(self):
        names = {p.name for p in self._handler().spec.inputs}
        assert "signal" in names

    def test_spec_has_output_port(self):
        names = {p.name for p in self._handler().spec.outputs}
        assert "output" in names

    def test_spec_has_no_params(self):
        assert self._handler().spec.params == ()

    def test_compute_true_values_pass_through(self):
        h = self._handler()
        ctx = _ctx({"signal": [True, True, True]})
        assert h.compute(ctx)["output"] == [True, True, True]

    def test_compute_false_values_pass_through(self):
        h = self._handler()
        ctx = _ctx({"signal": [False, False, False]})
        assert h.compute(ctx)["output"] == [False, False, False]

    def test_compute_mixed_booleans(self):
        h = self._handler()
        ctx = _ctx({"signal": [True, False, True, False]})
        assert h.compute(ctx)["output"] == [True, False, True, False]

    def test_compute_numeric_truthy_coerced(self):
        h = self._handler()
        ctx = _ctx({"signal": [1.0, 0.0, 2.5, -1.0]})
        assert h.compute(ctx)["output"] == [True, False, True, True]

    def test_compute_zero_is_false(self):
        h = self._handler()
        ctx = _ctx({"signal": [0, 0.0]})
        assert h.compute(ctx)["output"] == [False, False]

    def test_compute_none_is_false(self):
        h = self._handler()
        ctx = _ctx({"signal": [None, True, None]})
        assert h.compute(ctx)["output"] == [False, True, False]

    def test_compute_no_input_defaults_to_false(self):
        h = self._handler()
        ctx = _ctx_n(3)
        result = h.compute(ctx)
        assert result["output"] == [False, False, False]

    def test_validate_always_returns_empty(self):
        assert self._handler().validate({}) == []

    def test_does_not_read_candle_data(self):
        from app.backtest.catalogue.types import BlockContext

        ctx = BlockContext(candle_data={}, params={}, inputs={"signal": [False, True]}, n=2)
        result = self._handler().compute(ctx)
        assert result["output"] == [False, True]


# ── catalogue registration ────────────────────────────────────────────────────

class TestCatalogueRegistration:
    def test_entry_signal_in_catalogue(self):
        from app.backtest.catalogue import CATALOGUE
        assert "entry_signal" in CATALOGUE

    def test_exit_signal_in_catalogue(self):
        from app.backtest.catalogue import CATALOGUE
        assert "exit_signal" in CATALOGUE

    def test_lookup_entry_signal_returns_handler(self):
        from app.backtest.catalogue import lookup
        assert lookup("entry_signal") is not None

    def test_lookup_exit_signal_returns_handler(self):
        from app.backtest.catalogue import lookup
        assert lookup("exit_signal") is not None


# ── interpreter dispatches through catalogue ──────────────────────────────────

class TestInterpreterDispatch:
    """Interpreter must route signal blocks via catalogue, not its own elif."""

    def _minimal_strategy(self, entry_block_type: str = "entry_signal") -> dict:
        return {
            "blocks": [
                {"id": "src", "type": "constant", "params": {"value": 1}},
                {"id": "sig", "type": entry_block_type, "params": {}},
            ],
            "connections": [
                {
                    "from_port": {"block_id": "src", "port": "output"},
                    "to_port": {"block_id": "sig", "port": "signal"},
                }
            ],
        }

    def _candles(self, n: int = 3):
        from app.models.candle import Candle
        from datetime import datetime, timezone

        return [
            Candle(
                open=1.0, high=1.0, low=1.0, close=1.0,
                volume=1.0, timestamp=datetime(2024, 1, i + 1, tzinfo=timezone.utc),
            )
            for i in range(n)
        ]

    def test_entry_signal_dispatched_via_catalogue(self):
        from app.backtest.interpreter import interpret_strategy

        definition = self._minimal_strategy("entry_signal")
        signals = interpret_strategy(definition, self._candles(3))
        assert signals.entry_long == [True, True, True]

    def test_exit_signal_dispatched_via_catalogue(self):
        from app.backtest.interpreter import interpret_strategy

        definition = {
            "blocks": [
                {"id": "src", "type": "constant", "params": {"value": 1}},
                {"id": "entry", "type": "entry_signal", "params": {}},
                {"id": "exit", "type": "exit_signal", "params": {}},
            ],
            "connections": [
                {
                    "from_port": {"block_id": "src", "port": "output"},
                    "to_port": {"block_id": "entry", "port": "signal"},
                },
                {
                    "from_port": {"block_id": "src", "port": "output"},
                    "to_port": {"block_id": "exit", "port": "signal"},
                },
            ],
        }
        signals = interpret_strategy(definition, self._candles(3))
        assert signals.exit_long == [True, True, True]

    def test_entry_signal_false_when_no_input(self):
        """Unconnected entry_signal must output all-False (default)."""
        from app.backtest.interpreter import interpret_strategy

        definition = {
            "blocks": [
                {"id": "sig", "type": "entry_signal", "params": {}},
                {"id": "esig", "type": "exit_signal", "params": {}},
            ],
            "connections": [],
        }
        signals = interpret_strategy(definition, self._candles(2))
        assert signals.entry_long == [False, False]
        assert signals.exit_long == [False, False]
