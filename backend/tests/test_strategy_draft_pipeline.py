"""Tests for the repair-orchestrator helper (ADR-0015, issue #625).

Module-A test matrix: real GraphCompiler + Strategy validator (not mocked),
small intention-named fake drafters — not `unittest.mock` scripting.
"""
from app.core.config import settings
from app.schemas.strategy_draft_ir import (
    DeclinedOutcome,
    DraftedBlockIR,
    DraftedConnectionIR,
    DraftedIR,
    DraftedOutcome,
)
from app.services.strategy_draft_pipeline import (
    DraftPipelineDeclined,
    DraftPipelineSuccess,
    draft_and_repair,
)

# A clean RSI-oversold-bounce IR: entry + exit, fully connected, validator-clean.
_VALID_IR = DraftedIR(
    blocks=[
        DraftedBlockIR(ref="rsi", type="rsi", label="RSI (14)", params={"period": 14, "source": "close"}),
        DraftedBlockIR(ref="oversold", type="constant", label="Oversold (30)", params={"value": 30}),
        DraftedBlockIR(ref="overbought", type="constant", label="Overbought (70)", params={"value": 70}),
        DraftedBlockIR(ref="entry_compare", type="compare", label="RSI < 30", params={"operator": "<"}),
        DraftedBlockIR(ref="exit_compare", type="compare", label="RSI > 70", params={"operator": ">"}),
        DraftedBlockIR(ref="entry", type="entry_signal", label="Entry Signal", params={}),
        DraftedBlockIR(ref="exit", type="exit_signal", label="Exit Signal", params={}),
    ],
    connections=[
        DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="entry_compare", to_port="left"),
        DraftedConnectionIR(from_ref="oversold", from_port="output", to_ref="entry_compare", to_port="right"),
        DraftedConnectionIR(from_ref="entry_compare", from_port="output", to_ref="entry", to_port="signal"),
        DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="exit_compare", to_port="left"),
        DraftedConnectionIR(from_ref="overbought", from_port="output", to_ref="exit_compare", to_port="right"),
        DraftedConnectionIR(from_ref="exit_compare", from_port="output", to_ref="exit", to_port="signal"),
    ],
)

# Entry only, no exit -> validator MISSING_EXIT.
_INVALID_IR_NO_EXIT = DraftedIR(
    blocks=[
        DraftedBlockIR(ref="rsi", type="rsi", label="RSI (14)", params={"period": 14, "source": "close"}),
        DraftedBlockIR(ref="oversold", type="constant", label="Oversold (30)", params={"value": 30}),
        DraftedBlockIR(ref="entry_compare", type="compare", label="RSI < 30", params={"operator": "<"}),
        DraftedBlockIR(ref="entry", type="entry_signal", label="Entry Signal", params={}),
    ],
    connections=[
        DraftedConnectionIR(from_ref="rsi", from_port="output", to_ref="entry_compare", to_port="left"),
        DraftedConnectionIR(from_ref="oversold", from_port="output", to_ref="entry_compare", to_port="right"),
        DraftedConnectionIR(from_ref="entry_compare", from_port="output", to_ref="entry", to_port="signal"),
    ],
)

# Entry + exit present, but an out-of-range position size -> validator INVALID_PERCENT.
_INVALID_IR_BAD_POSITION_SIZE = DraftedIR(
    blocks=[
        *_VALID_IR.blocks,
        DraftedBlockIR(ref="size", type="position_size", label="Position Size (500%)", params={"value": 500}),
    ],
    connections=_VALID_IR.connections,
)


class DraftsCleanFirstTry:
    """Initial draft is already validator-clean; `redraft` must never be called."""

    def draft(self, nl_text):
        return DraftedOutcome(ir=_VALID_IR)

    def redraft(self, nl_text, prior_ir, errors):
        raise AssertionError("redraft should not be called when the first draft is valid")


class DraftsInvalidThenValid:
    """First draft is missing an exit; the repair pass returns a valid IR."""

    def __init__(self):
        self.redraft_calls: list[tuple] = []

    def draft(self, nl_text):
        return DraftedOutcome(ir=_INVALID_IR_NO_EXIT)

    def redraft(self, nl_text, prior_ir, errors):
        self.redraft_calls.append((nl_text, prior_ir, errors))
        return DraftedOutcome(ir=_VALID_IR)


class DraftsInvalidTwice:
    """First draft is missing an exit; the repair pass is invalid for a
    different reason (an out-of-range position size), so the decline must
    surface the *repaired* attempt's error, not the original's."""

    def draft(self, nl_text):
        return DraftedOutcome(ir=_INVALID_IR_NO_EXIT)

    def redraft(self, nl_text, prior_ir, errors):
        return DraftedOutcome(ir=_INVALID_IR_BAD_POSITION_SIZE)


class DraftsThenDeclines:
    """First draft is missing an exit; the repair pass declines outright."""

    def draft(self, nl_text):
        return DraftedOutcome(ir=_INVALID_IR_NO_EXIT)

    def redraft(self, nl_text, prior_ir, errors):
        return DeclinedOutcome(reason="Still can't express this with the available blocks.")


def test_clean_first_try_returns_success_with_no_repair_call():
    result = draft_and_repair(DraftsCleanFirstTry(), "buy when RSI is oversold")

    assert isinstance(result, DraftPipelineSuccess)
    assert len(result.definition["blocks"]) > 0


def test_invalid_then_valid_repair_returns_success():
    drafter = DraftsInvalidThenValid()

    result = draft_and_repair(drafter, "buy when RSI drops below 30")

    assert isinstance(result, DraftPipelineSuccess)
    assert len(drafter.redraft_calls) == 1
    nl_text, prior_ir, errors = drafter.redraft_calls[0]
    assert nl_text == "buy when RSI drops below 30"
    assert prior_ir == _INVALID_IR_NO_EXIT
    assert errors[0].code == "MISSING_EXIT"


def test_invalid_then_still_invalid_declines_with_repaired_error():
    result = draft_and_repair(DraftsInvalidTwice(), "buy when RSI drops below 30")

    assert isinstance(result, DraftPipelineDeclined)
    assert "Percentage must be between" in result.reason


def test_redraft_declines_returns_declined_with_model_reason():
    result = draft_and_repair(DraftsThenDeclines(), "buy when RSI drops below 30")

    assert isinstance(result, DraftPipelineDeclined)
    assert result.reason == "Still can't express this with the available blocks."


def test_max_repairs_zero_declines_without_repair_attempt(monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_max_repairs", 0)
    drafter = DraftsInvalidThenValid()

    result = draft_and_repair(drafter, "buy when RSI drops below 30")

    assert isinstance(result, DraftPipelineDeclined)
    assert result.reason == "Add at least one exit rule (Exit Signal, Stop Loss, Take Profit, etc.)."
    assert drafter.redraft_calls == []
