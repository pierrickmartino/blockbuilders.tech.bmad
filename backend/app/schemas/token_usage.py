"""`TokenUsage` — a provider-neutral, additive token-cost value object
(ADR-0016 §4).

Tokens, not dollars: dollars are computed downstream in the log/BI layer
since prices change and the model is swappable (ADR-0011). The zero value
(`TokenUsage()`) covers the stub drafter and any usage-unavailable case.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TokenUsage:
    """Input/output token counts for one LLM call."""

    input_tokens: int = 0
    output_tokens: int = 0

    def __add__(self, other: TokenUsage) -> TokenUsage:
        return TokenUsage(
            input_tokens=self.input_tokens + other.input_tokens,
            output_tokens=self.output_tokens + other.output_tokens,
        )
