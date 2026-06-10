"""Tests for app.core.config — strategy drafter startup validation (issue #588).

ADR-0011: at startup, when `strategy_drafter_enabled` is true, the *selected*
provider's API key must be present (fail fast). Unused providers' keys are
not required.
"""
import pytest

from app.core.config import settings, validate_strategy_drafter_config


def test_validate_strategy_drafter_config_skips_when_disabled(monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", False)
    monkeypatch.setattr(settings, "strategy_drafter_provider", "anthropic")
    monkeypatch.setattr(settings, "anthropic_api_key", "")

    validate_strategy_drafter_config(settings)


def test_validate_strategy_drafter_config_raises_when_selected_provider_key_missing(monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr(settings, "strategy_drafter_provider", "anthropic")
    monkeypatch.setattr(settings, "anthropic_api_key", "")

    with pytest.raises(RuntimeError, match="anthropic_api_key"):
        validate_strategy_drafter_config(settings)


def test_validate_strategy_drafter_config_passes_when_selected_provider_key_present(monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr(settings, "strategy_drafter_provider", "anthropic")
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-present")

    validate_strategy_drafter_config(settings)


def test_validate_strategy_drafter_config_does_not_require_other_providers_keys(monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr(settings, "strategy_drafter_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "sk-openai-present")
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    monkeypatch.setattr(settings, "openrouter_api_key", "")

    validate_strategy_drafter_config(settings)


def test_validate_strategy_drafter_config_raises_for_unsupported_provider(monkeypatch):
    monkeypatch.setattr(settings, "strategy_drafter_enabled", True)
    monkeypatch.setattr(settings, "strategy_drafter_provider", "azure")

    with pytest.raises(RuntimeError, match="azure"):
        validate_strategy_drafter_config(settings)
