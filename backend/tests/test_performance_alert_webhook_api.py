"""Schema validation tests for webhook fields on performance alerts."""
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.alert import AlertRuleCreate


def test_schema_performance_alert_accepts_webhook_fields():
    data = AlertRuleCreate(
        alert_type="performance",
        backtest_run_id=uuid4(),
        alert_on_entry=True,
        notify_webhook=True,
        webhook_url="https://example.com/hook",
    )
    assert data.notify_webhook is True
    assert data.webhook_url == "https://example.com/hook"


def test_schema_performance_alert_webhook_url_required_when_notify_webhook_true():
    with pytest.raises(ValidationError, match="webhook_url required"):
        AlertRuleCreate(
            alert_type="performance",
            backtest_run_id=uuid4(),
            alert_on_entry=True,
            notify_webhook=True,
            webhook_url=None,
        )


def test_schema_performance_alert_notify_webhook_false_without_url_is_valid():
    data = AlertRuleCreate(
        alert_type="performance",
        backtest_run_id=uuid4(),
        alert_on_entry=True,
        notify_webhook=False,
    )
    assert data.notify_webhook is False
    assert data.webhook_url is None
