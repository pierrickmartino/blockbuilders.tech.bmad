"""Tests for POST /backtests/compare (backtest_compare router)."""
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.models.backtest_run import BacktestRun


def _fake_equity(key):
    return [{"timestamp": "2024-01-01T00:00:00Z", "equity": 10000}]


@pytest.fixture
def second_run(session, user, seeded_objects):
    run = BacktestRun(
        id=uuid4(),
        user_id=user.id,
        strategy_id=seeded_objects["strategy"].id,
        strategy_version_id=seeded_objects["version"].id,
        status="completed",
        asset="ETH/USDT",
        timeframe="1d",
        date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 1, 10, tzinfo=timezone.utc),
        total_return=5.0,
        num_trades=2,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


def test_compare_requires_at_least_two_runs(client, auth_headers, seeded_objects):
    r = client.post(
        "/backtests/compare",
        headers=auth_headers,
        json={"run_ids": [str(seeded_objects["run"].id)]},
    )
    assert r.status_code == 400
    assert "2" in r.json()["detail"]


def test_compare_rejects_more_than_four_runs(client, auth_headers):
    r = client.post(
        "/backtests/compare",
        headers=auth_headers,
        json={"run_ids": [str(uuid4()) for _ in range(5)]},
    )
    assert r.status_code == 400
    assert "4" in r.json()["detail"]


def test_compare_returns_404_for_unknown_run(client, auth_headers, seeded_objects):
    r = client.post(
        "/backtests/compare",
        headers=auth_headers,
        json={"run_ids": [str(seeded_objects["run"].id), str(uuid4())]},
    )
    assert r.status_code == 404


def test_compare_rejects_non_completed_run(client, auth_headers, session, user, seeded_objects):
    pending = BacktestRun(
        id=uuid4(),
        user_id=user.id,
        strategy_id=seeded_objects["strategy"].id,
        strategy_version_id=seeded_objects["version"].id,
        status="pending",
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 1, 10, tzinfo=timezone.utc),
    )
    session.add(pending)
    session.commit()
    r = client.post(
        "/backtests/compare",
        headers=auth_headers,
        json={"run_ids": [str(seeded_objects["run"].id), str(pending.id)]},
    )
    assert r.status_code == 400
    assert "completed" in r.json()["detail"]


def test_compare_two_completed_runs_returns_200(client, auth_headers, seeded_objects, second_run, monkeypatch):
    monkeypatch.setattr("app.api.backtest_compare.download_json", _fake_equity)
    r = client.post(
        "/backtests/compare",
        headers=auth_headers,
        json={"run_ids": [str(seeded_objects["run"].id), str(second_run.id)]},
    )
    assert r.status_code == 200
    body = r.json()
    assert "runs" in body
    assert len(body["runs"]) == 2
