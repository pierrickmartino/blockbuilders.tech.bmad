"""Tests for DomainError infrastructure."""
import pytest

from app.schemas.strategy import ValidationError


def test_strategy_validation_error_status_code():
    from app.services.exceptions import StrategyValidationError

    err = StrategyValidationError(errors=[])
    assert err.status_code == 400


def test_strategy_validation_error_detail_empty():
    from app.services.exceptions import StrategyValidationError

    err = StrategyValidationError(errors=[])
    assert err.detail() == {"errors": []}


def test_strategy_validation_error_detail_with_errors():
    from app.services.exceptions import StrategyValidationError

    errors = [ValidationError(code="MISSING_ENTRY", message="At least one entry signal required")]
    err = StrategyValidationError(errors=errors)
    detail = err.detail()
    assert len(detail["errors"]) == 1
    assert detail["errors"][0]["code"] == "MISSING_ENTRY"


def test_strategy_validation_error_is_domain_error():
    from app.services.exceptions import DomainError, StrategyValidationError

    err = StrategyValidationError(errors=[])
    assert isinstance(err, DomainError)


def test_domain_error_is_exception():
    from app.services.exceptions import DomainError

    assert issubclass(DomainError, Exception)
