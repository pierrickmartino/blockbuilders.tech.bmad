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
