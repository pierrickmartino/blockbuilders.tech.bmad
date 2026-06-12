"""Repair-orchestrator helper (ADR-0015) — owns the `draft -> compile ->
validate [-> redraft]*` cadence for the NL wedge's draft-from-nl endpoint.

The compiler and Strategy validator stay outside the `StrategyDrafter` seam
(ADR-0011); this helper wires them together with an injected drafter, bounded
by `strategy_drafter_max_repairs`. Nothing partial persists on any
intermediate failure — the caller decides what to do with the result.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from app.core.config import settings
from app.schemas.strategy import StrategyDefinitionValidate
from app.schemas.token_usage import TokenUsage
from app.services.graph_compiler import GraphCompilationError, compile_graph
from app.services.strategy_drafter import StrategyDrafter
from app.services.strategy_validation import collect_validation_errors

# Repair-resolution telemetry (issue #626): how the request resolved through
# the repair loop. Orthogonal to Draft outcome (accepted/edited/kept/rejected)
# — `clean`/`repaired` are generation-side ("did we need a repair?"), Draft
# outcome is user-side.
DraftResolution = Literal["clean", "repaired", "declined"]


@dataclass(frozen=True)
class DraftPipelineSuccess:
    """A drafted graph that compiled and passed the Strategy validator."""

    definition: dict[str, Any]
    resolution: DraftResolution
    token_usage: TokenUsage
    repair_count: int


@dataclass(frozen=True)
class DraftPipelineDeclined:
    """Nothing persisted; `reason` is the plain-language refusal to surface."""

    reason: str
    token_usage: TokenUsage
    repair_count: int
    resolution: DraftResolution = "declined"


DraftPipelineResult = DraftPipelineSuccess | DraftPipelineDeclined


def draft_and_repair(drafter: StrategyDrafter, nl_text: str) -> DraftPipelineResult:
    """Run the repair pass (ADR-0015): re-generate up to `max_repairs` times
    on validator failure before declining.

    Accumulates `TokenUsage` across the draft and any repair call into a
    per-request total, surfaced alongside `repair_count` (ADR-0016 §4).
    """
    result, token_usage = drafter.draft(nl_text)
    attempt = 0

    while True:
        if result.outcome == "declined":
            return DraftPipelineDeclined(reason=result.reason, token_usage=token_usage, repair_count=attempt)

        try:
            definition = compile_graph(result.ir)
        except GraphCompilationError as exc:
            return DraftPipelineDeclined(reason=str(exc), token_usage=token_usage, repair_count=attempt)

        parsed_definition = StrategyDefinitionValidate.model_validate(definition)
        errors = collect_validation_errors(parsed_definition)
        if not errors:
            resolution: DraftResolution = "clean" if attempt == 0 else "repaired"
            return DraftPipelineSuccess(
                definition=definition, resolution=resolution, token_usage=token_usage, repair_count=attempt
            )

        if attempt >= settings.strategy_drafter_max_repairs:
            return DraftPipelineDeclined(
                reason=errors[0].user_message or errors[0].message,
                token_usage=token_usage,
                repair_count=attempt,
            )

        result, repair_usage = drafter.redraft(nl_text, result.ir, errors)
        token_usage = token_usage + repair_usage
        attempt += 1
