"""Tests for blocks migrated in issue #418: logic blocks.

Covers: compare, crossover, and, or, not.
All tests use canned BlockContext.inputs — no candle_data access.
"""
from __future__ import annotations

from typing import Any


# ── helpers ───────────────────────────────────────────────────────────────────

def _ctx(inputs: dict[str, list], params: dict | None = None) -> Any:
    from app.backtest.catalogue.types import BlockContext

    n = max((len(v) for v in inputs.values()), default=3)
    candle_data: dict[str, list] = {}
    return BlockContext(candle_data=candle_data, params=params or {}, inputs=inputs, n=n)


# ── compare ───────────────────────────────────────────────────────────────────

class TestCompareHandler:
    def _handler(self):
        from app.backtest.catalogue.logic.compare import CompareHandler
        return CompareHandler()

    def test_spec_type_and_category(self):
        h = self._handler()
        assert h.spec.type == "compare"
        assert h.spec.category == "logic"

    def test_spec_has_left_right_inputs(self):
        h = self._handler()
        names = {p.name for p in h.spec.inputs}
        assert "left" in names
        assert "right" in names

    def test_spec_has_output_port(self):
        h = self._handler()
        names = {p.name for p in h.spec.outputs}
        assert "output" in names

    def test_operator_greater_than(self):
        h = self._handler()
        ctx = _ctx({"left": [2.0, 1.0, 3.0], "right": [1.0, 2.0, 3.0]}, {"operator": ">"})
        result = h.compute(ctx)
        assert result["output"] == [True, False, False]

    def test_operator_less_than(self):
        h = self._handler()
        ctx = _ctx({"left": [1.0, 2.0, 3.0], "right": [2.0, 1.0, 3.0]}, {"operator": "<"})
        result = h.compute(ctx)
        assert result["output"] == [True, False, False]

    def test_operator_gte(self):
        h = self._handler()
        ctx = _ctx({"left": [2.0, 1.0, 3.0], "right": [1.0, 2.0, 3.0]}, {"operator": ">="})
        result = h.compute(ctx)
        assert result["output"] == [True, False, True]

    def test_operator_lte(self):
        h = self._handler()
        ctx = _ctx({"left": [1.0, 2.0, 3.0], "right": [2.0, 1.0, 3.0]}, {"operator": "<="})
        result = h.compute(ctx)
        assert result["output"] == [True, False, True]

    # Alias normalization — every accepted alias string
    def test_alias_above(self):
        h = self._handler()
        ctx = _ctx({"left": [5.0], "right": [3.0]}, {"operator": "above"})
        assert h.compute(ctx)["output"] == [True]

    def test_alias_gt(self):
        h = self._handler()
        ctx = _ctx({"left": [5.0], "right": [3.0]}, {"operator": "gt"})
        assert h.compute(ctx)["output"] == [True]

    def test_alias_greater_than(self):
        h = self._handler()
        ctx = _ctx({"left": [5.0], "right": [3.0]}, {"operator": "greater_than"})
        assert h.compute(ctx)["output"] == [True]

    def test_alias_below(self):
        h = self._handler()
        ctx = _ctx({"left": [1.0], "right": [3.0]}, {"operator": "below"})
        assert h.compute(ctx)["output"] == [True]

    def test_alias_lt(self):
        h = self._handler()
        ctx = _ctx({"left": [1.0], "right": [3.0]}, {"operator": "lt"})
        assert h.compute(ctx)["output"] == [True]

    def test_alias_less_than(self):
        h = self._handler()
        ctx = _ctx({"left": [1.0], "right": [3.0]}, {"operator": "less_than"})
        assert h.compute(ctx)["output"] == [True]

    def test_alias_gte(self):
        h = self._handler()
        ctx = _ctx({"left": [3.0], "right": [3.0]}, {"operator": "gte"})
        assert h.compute(ctx)["output"] == [True]

    def test_alias_at_or_above(self):
        h = self._handler()
        ctx = _ctx({"left": [3.0], "right": [3.0]}, {"operator": "at_or_above"})
        assert h.compute(ctx)["output"] == [True]

    def test_alias_greater_than_or_equal(self):
        h = self._handler()
        ctx = _ctx({"left": [3.0], "right": [3.0]}, {"operator": "greater_than_or_equal"})
        assert h.compute(ctx)["output"] == [True]

    def test_alias_lte(self):
        h = self._handler()
        ctx = _ctx({"left": [3.0], "right": [3.0]}, {"operator": "lte"})
        assert h.compute(ctx)["output"] == [True]

    def test_alias_at_or_below(self):
        h = self._handler()
        ctx = _ctx({"left": [3.0], "right": [3.0]}, {"operator": "at_or_below"})
        assert h.compute(ctx)["output"] == [True]

    def test_alias_less_than_or_equal(self):
        h = self._handler()
        ctx = _ctx({"left": [3.0], "right": [3.0]}, {"operator": "less_than_or_equal"})
        assert h.compute(ctx)["output"] == [True]

    def test_legacy_port_names_a_b(self):
        """Legacy strategies use 'a'/'b' port names — must still work."""
        h = self._handler()
        ctx = _ctx({"a": [5.0, 1.0], "b": [3.0, 2.0]}, {"operator": ">"})
        result = h.compute(ctx)
        assert result["output"] == [True, False]

    def test_null_values_return_false(self):
        h = self._handler()
        ctx = _ctx({"left": [None, 2.0], "right": [1.0, None]}, {"operator": ">"})
        result = h.compute(ctx)
        assert result["output"] == [False, False]

    def test_unknown_operator_returns_false(self):
        h = self._handler()
        ctx = _ctx({"left": [5.0], "right": [3.0]}, {"operator": "invalid_op"})
        result = h.compute(ctx)
        assert result["output"] == [False]

    def test_validate_rejects_invalid_operator(self):
        h = self._handler()
        issues = h.validate({"operator": "not_an_op"})
        assert len(issues) >= 1
        assert any(i.code == "INVALID_OPERATOR" for i in issues)

    def test_validate_accepts_all_operator_aliases(self):
        h = self._handler()
        valid_ops = [
            ">", "<", ">=", "<=",
            "above", "below", "gte", "lte",
            "gt", "lt", "at_or_above", "at_or_below",
            "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal",
        ]
        for op in valid_ops:
            assert h.validate({"operator": op}) == [], f"Expected valid: {op}"

    def test_validate_accepts_empty_params(self):
        h = self._handler()
        assert h.validate({}) == []

    def test_does_not_read_candle_data(self):
        """compute must not access candle_data."""
        from app.backtest.catalogue.types import BlockContext
        ctx = BlockContext(candle_data={}, params={"operator": ">"}, inputs={"left": [2.0], "right": [1.0]}, n=1)
        h = self._handler()
        result = h.compute(ctx)
        assert result["output"] == [True]


# ── crossover ─────────────────────────────────────────────────────────────────

class TestCrossoverHandler:
    def _handler(self):
        from app.backtest.catalogue.logic.crossover import CrossoverHandler
        return CrossoverHandler()

    def test_spec_type_and_category(self):
        h = self._handler()
        assert h.spec.type == "crossover"
        assert h.spec.category == "logic"

    def test_spec_has_fast_slow_inputs(self):
        h = self._handler()
        names = {p.name for p in h.spec.inputs}
        assert "fast" in names
        assert "slow" in names

    def test_crosses_above_detected(self):
        h = self._handler()
        # fast goes from below to above slow
        fast = [1.0, 5.0]
        slow = [3.0, 3.0]
        ctx = _ctx({"fast": fast, "slow": slow}, {"direction": "crosses_above"})
        result = h.compute(ctx)
        assert result["output"] == [False, True]

    def test_crosses_below_detected(self):
        h = self._handler()
        # fast goes from above to below slow
        fast = [5.0, 1.0]
        slow = [3.0, 3.0]
        ctx = _ctx({"fast": fast, "slow": slow}, {"direction": "crosses_below"})
        result = h.compute(ctx)
        assert result["output"] == [False, True]

    def test_no_crossover_when_parallel(self):
        h = self._handler()
        fast = [5.0, 6.0, 7.0]
        slow = [3.0, 3.0, 3.0]
        ctx = _ctx({"fast": fast, "slow": slow}, {"direction": "crosses_above"})
        result = h.compute(ctx)
        assert result["output"] == [False, False, False]

    def test_first_candle_always_false(self):
        h = self._handler()
        ctx = _ctx({"fast": [10.0], "slow": [1.0]}, {"direction": "crosses_above"})
        result = h.compute(ctx)
        assert result["output"] == [False]

    def test_none_values_return_false(self):
        h = self._handler()
        fast = [None, 5.0]
        slow = [3.0, 3.0]
        ctx = _ctx({"fast": fast, "slow": slow}, {"direction": "crosses_above"})
        result = h.compute(ctx)
        assert result["output"] == [False, False]

    def test_validate_rejects_invalid_direction(self):
        h = self._handler()
        issues = h.validate({"direction": "invalid_dir"})
        assert len(issues) >= 1
        assert any(i.code == "INVALID_DIRECTION" for i in issues)

    def test_validate_accepts_valid_directions(self):
        h = self._handler()
        assert h.validate({"direction": "crosses_above"}) == []
        assert h.validate({"direction": "crosses_below"}) == []

    def test_validate_accepts_empty_params(self):
        h = self._handler()
        assert h.validate({}) == []

    def test_does_not_read_candle_data(self):
        from app.backtest.catalogue.types import BlockContext
        ctx = BlockContext(candle_data={}, params={"direction": "crosses_above"},
                          inputs={"fast": [1.0, 5.0], "slow": [3.0, 3.0]}, n=2)
        h = self._handler()
        result = h.compute(ctx)
        assert result["output"] == [False, True]


# ── and ───────────────────────────────────────────────────────────────────────

class TestAndHandler:
    def _handler(self):
        from app.backtest.catalogue.logic.and_ import AndHandler
        return AndHandler()

    def test_spec_type_and_category(self):
        h = self._handler()
        assert h.spec.type == "and"
        assert h.spec.category == "logic"

    def test_spec_has_a_b_inputs(self):
        h = self._handler()
        names = {p.name for p in h.spec.inputs}
        assert "a" in names
        assert "b" in names

    def test_truth_table(self):
        h = self._handler()
        ctx = _ctx({"a": [True, True, False, False], "b": [True, False, True, False]})
        result = h.compute(ctx)
        assert result["output"] == [True, False, False, False]

    def test_numeric_truthy(self):
        h = self._handler()
        ctx = _ctx({"a": [1.0, 0.0, 1.0], "b": [1.0, 1.0, 0.0]})
        result = h.compute(ctx)
        assert result["output"] == [True, False, False]

    def test_none_is_falsy(self):
        h = self._handler()
        ctx = _ctx({"a": [None, True], "b": [True, True]})
        result = h.compute(ctx)
        assert result["output"] == [False, True]

    def test_validate_always_valid(self):
        h = self._handler()
        assert h.validate({}) == []

    def test_does_not_read_candle_data(self):
        from app.backtest.catalogue.types import BlockContext
        ctx = BlockContext(candle_data={}, params={}, inputs={"a": [True], "b": [False]}, n=1)
        h = self._handler()
        assert h.compute(ctx)["output"] == [False]


# ── or ────────────────────────────────────────────────────────────────────────

class TestOrHandler:
    def _handler(self):
        from app.backtest.catalogue.logic.or_ import OrHandler
        return OrHandler()

    def test_spec_type_and_category(self):
        h = self._handler()
        assert h.spec.type == "or"
        assert h.spec.category == "logic"

    def test_spec_has_a_b_inputs(self):
        h = self._handler()
        names = {p.name for p in h.spec.inputs}
        assert "a" in names
        assert "b" in names

    def test_truth_table(self):
        h = self._handler()
        ctx = _ctx({"a": [True, True, False, False], "b": [True, False, True, False]})
        result = h.compute(ctx)
        assert result["output"] == [True, True, True, False]

    def test_numeric_truthy(self):
        h = self._handler()
        ctx = _ctx({"a": [0.0, 1.0, 0.0], "b": [0.0, 0.0, 1.0]})
        result = h.compute(ctx)
        assert result["output"] == [False, True, True]

    def test_none_is_falsy(self):
        h = self._handler()
        ctx = _ctx({"a": [None, None], "b": [True, None]})
        result = h.compute(ctx)
        assert result["output"] == [True, False]

    def test_validate_always_valid(self):
        h = self._handler()
        assert h.validate({}) == []

    def test_does_not_read_candle_data(self):
        from app.backtest.catalogue.types import BlockContext
        ctx = BlockContext(candle_data={}, params={}, inputs={"a": [False], "b": [True]}, n=1)
        h = self._handler()
        assert h.compute(ctx)["output"] == [True]


# ── not ───────────────────────────────────────────────────────────────────────

class TestNotHandler:
    def _handler(self):
        from app.backtest.catalogue.logic.not_ import NotHandler
        return NotHandler()

    def test_spec_type_and_category(self):
        h = self._handler()
        assert h.spec.type == "not"
        assert h.spec.category == "logic"

    def test_spec_has_input_port(self):
        h = self._handler()
        names = {p.name for p in h.spec.inputs}
        assert "input" in names

    def test_negates_booleans(self):
        h = self._handler()
        ctx = _ctx({"input": [True, False, True]})
        result = h.compute(ctx)
        assert result["output"] == [False, True, False]

    def test_numeric_truthy(self):
        h = self._handler()
        ctx = _ctx({"input": [1.0, 0.0, 2.5]})
        result = h.compute(ctx)
        assert result["output"] == [False, True, False]

    def test_none_is_falsy(self):
        h = self._handler()
        ctx = _ctx({"input": [None, True]})
        result = h.compute(ctx)
        assert result["output"] == [True, False]

    def test_validate_always_valid(self):
        h = self._handler()
        assert h.validate({}) == []

    def test_does_not_read_candle_data(self):
        from app.backtest.catalogue.types import BlockContext
        ctx = BlockContext(candle_data={}, params={}, inputs={"input": [True, False]}, n=2)
        h = self._handler()
        assert h.compute(ctx)["output"] == [False, True]


# ── catalogue registration ────────────────────────────────────────────────────

class TestCatalogueRegistration:
    def test_all_logic_blocks_in_catalogue(self):
        from app.backtest.catalogue import CATALOGUE
        for block_type in ("compare", "crossover", "and", "or", "not"):
            assert block_type in CATALOGUE, f"'{block_type}' missing from CATALOGUE"

    def test_lookup_returns_handlers(self):
        from app.backtest.catalogue import lookup
        for block_type in ("compare", "crossover", "and", "or", "not"):
            assert lookup(block_type) is not None, f"lookup('{block_type}') returned None"
