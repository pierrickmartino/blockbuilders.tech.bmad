"""Tests for `TokenUsage` — a provider-neutral, additive value object for
per-request token cost (ADR-0016 §4, issue #633)."""
from app.schemas.token_usage import TokenUsage


def test_zero_value_has_zero_input_and_output_tokens():
    usage = TokenUsage()

    assert usage.input_tokens == 0
    assert usage.output_tokens == 0


def test_add_sums_input_and_output_tokens_across_calls():
    draft_usage = TokenUsage(input_tokens=120, output_tokens=80)
    repair_usage = TokenUsage(input_tokens=150, output_tokens=40)

    total = draft_usage + repair_usage

    assert total == TokenUsage(input_tokens=270, output_tokens=120)


def test_add_with_zero_value_is_identity():
    usage = TokenUsage(input_tokens=100, output_tokens=50)

    assert usage + TokenUsage() == usage
