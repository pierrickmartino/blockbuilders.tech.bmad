"""Tests for backend analytics helpers."""

from unittest.mock import MagicMock
from uuid import uuid4

from app.services import analytics
from app.worker import jobs


def test_flush_backend_events_flushes_and_shuts_down_client(monkeypatch):
    client = MagicMock()
    monkeypatch.setattr(analytics, "_client", client)

    analytics.flush_backend_events(shutdown=True)

    client.flush.assert_called_once()
    client.shutdown.assert_called_once()
    assert analytics._client is None


def test_flush_backend_events_no_client_is_noop(monkeypatch):
    monkeypatch.setattr(analytics, "_client", None)
    analytics.flush_backend_events(shutdown=True)


def test_track_backend_event_merges_properties_into_the_envelope(monkeypatch):
    client = MagicMock()
    monkeypatch.setattr(analytics, "_client", client)

    user_id = uuid4()
    strategy_id = uuid4()
    correlation_id = uuid4()

    analytics.track_backend_event(
        "backtest_completed",
        user_id=user_id,
        strategy_id=strategy_id,
        correlation_id=correlation_id,
        duration_ms=500,
        properties={"is_first": True, "triggered_by": "auto", "source": "server"},
    )

    client.capture.assert_called_once()
    _, kwargs = client.capture.call_args
    assert kwargs["event"] == "backtest_completed"
    assert kwargs["distinct_id"] == str(user_id)

    properties = kwargs["properties"]
    assert properties["is_first"] is True
    assert properties["triggered_by"] == "auto"
    assert properties["source"] == "server"
    # The standard envelope is preserved alongside the merged properties.
    assert properties["correlation_id"] == str(correlation_id)
    assert properties["strategy_id"] == str(strategy_id)
    assert properties["duration_ms"] == 500


def test_track_backend_event_without_properties_sends_only_the_envelope(monkeypatch):
    client = MagicMock()
    monkeypatch.setattr(analytics, "_client", client)

    analytics.track_backend_event(
        "backtest_job_started",
        user_id=uuid4(),
        strategy_id=uuid4(),
        correlation_id=uuid4(),
    )

    client.capture.assert_called_once()
    _, kwargs = client.capture.call_args
    assert set(kwargs["properties"]) == {
        "correlation_id",
        "user_id",
        "strategy_id",
        "duration_ms",
        "timestamp",
    }


def test_run_backtest_job_flushes_analytics_on_return(monkeypatch):
    flush_mock = MagicMock()
    monkeypatch.setattr(jobs, "flush_backend_events", flush_mock)

    class FakeExecResult:
        def first(self):
            return None

    class FakeSession:
        def exec(self, _query):
            return FakeExecResult()

    class FakeSessionContext:
        def __enter__(self):
            return FakeSession()

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(jobs, "Session", lambda _engine: FakeSessionContext())

    jobs.run_backtest_job(str(uuid4()))

    flush_mock.assert_called_once_with(shutdown=True)
