"""Tests for /backtests/data-quality and /backtests/data-completeness endpoints."""
from datetime import datetime, timezone
from unittest.mock import patch
from uuid import uuid4

import pytest

from app.models.data_quality_metric import DataQualityMetric


def _make_metric(
    gap_percent: float = 0.0,
    outlier_count: int = 0,
    volume_consistency: float = 100.0,
    has_issues: bool = False,
) -> DataQualityMetric:
    return DataQualityMetric(
        id=uuid4(),
        asset="BTC/USDT",
        timeframe="1d",
        date=datetime(2024, 1, 1, tzinfo=timezone.utc),
        gap_percent=gap_percent,
        outlier_count=outlier_count,
        volume_consistency=volume_consistency,
        has_issues=has_issues,
    )


# ---------------------------------------------------------------------------
# GET /backtests/data-quality
# ---------------------------------------------------------------------------

class TestDataQualityEndpoint:
    BASE = "/backtests/data-quality"
    PARAMS = {
        "asset": "BTC/USDT",
        "timeframe": "1d",
        "date_from": "2024-01-01T00:00:00Z",
        "date_to": "2024-01-10T00:00:00Z",
    }

    def test_requires_authentication(self, client):
        r = client.get(self.BASE, params=self.PARAMS)
        assert r.status_code == 401

    def test_returns_200_with_no_stored_metrics(self, client, auth_headers):
        with patch("app.api.backtest_data_quality.query_metrics_for_range", return_value=[]):
            r = client.get(self.BASE, params=self.PARAMS, headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["asset"] == "BTC/USDT"
        assert body["timeframe"] == "1d"
        assert body["has_issues"] is False
        assert body["issues_description"] == "No quality data available yet"

    def test_aggregates_metrics_when_data_present(self, client, auth_headers):
        metrics = [_make_metric(gap_percent=5.0, outlier_count=2, volume_consistency=80.0, has_issues=True)]
        with patch("app.api.backtest_data_quality.query_metrics_for_range", return_value=metrics):
            r = client.get(self.BASE, params=self.PARAMS, headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["gap_percent"] == pytest.approx(5.0)
        assert body["outlier_count"] == 2
        assert body["volume_consistency"] == pytest.approx(80.0)
        assert body["has_issues"] is True

    def test_rejects_invalid_date_format(self, client, auth_headers):
        params = {**self.PARAMS, "date_from": "not-a-date"}
        r = client.get(self.BASE, params=params, headers=auth_headers)
        assert r.status_code == 400

    def test_rejects_date_to_before_date_from(self, client, auth_headers):
        params = {**self.PARAMS, "date_to": "2023-01-01T00:00:00Z"}
        r = client.get(self.BASE, params=params, headers=auth_headers)
        assert r.status_code == 400

    def test_missing_required_params_returns_422(self, client, auth_headers):
        r = client.get(self.BASE, headers=auth_headers)
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# GET /backtests/data-completeness
# ---------------------------------------------------------------------------

class TestDataCompletenessEndpoint:
    BASE = "/backtests/data-completeness"
    PARAMS = {"asset": "BTC/USDT", "timeframe": "1d"}

    def test_is_public_no_auth_needed(self, client):
        fake_metrics = {
            "coverage_start": None,
            "coverage_end": None,
            "completeness_percent": 0.0,
            "gap_count": 0,
            "gap_total_hours": 0.0,
            "gap_ranges": [],
        }
        with patch("app.api.backtest_data_quality.compute_completeness_metrics", return_value=fake_metrics):
            r = client.get(self.BASE, params=self.PARAMS)
        assert r.status_code == 200

    def test_returns_completeness_shape(self, client, auth_headers):
        fake_metrics = {
            "coverage_start": "2024-01-01T00:00:00Z",
            "coverage_end": "2024-12-31T00:00:00Z",
            "completeness_percent": 98.5,
            "gap_count": 3,
            "gap_total_hours": 72.0,
            "gap_ranges": [{"start": "2024-06-01T00:00:00Z", "end": "2024-06-02T00:00:00Z"}],
        }
        with patch("app.api.backtest_data_quality.compute_completeness_metrics", return_value=fake_metrics):
            r = client.get(self.BASE, params=self.PARAMS, headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["asset"] == "BTC/USDT"
        assert body["timeframe"] == "1d"
        assert body["completeness_percent"] == pytest.approx(98.5)
        assert body["gap_count"] == 3

    def test_missing_required_params_returns_422(self, client):
        r = client.get(self.BASE)
        assert r.status_code == 422
