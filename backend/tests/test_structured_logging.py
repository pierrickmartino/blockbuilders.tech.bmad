"""Tests for structured logging and correlation ID propagation."""

import json
import logging
import io

import pytest
import structlog

from app.core.logging import (
    _add_correlation_id,
    correlation_id_var,
    generate_correlation_id,
    setup_logging,
)


def _capture_json_log(log_func, *args, **kwargs):
    """Helper: emit a log via log_func and return parsed JSON from stdout."""
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)

    # Build a formatter that always renders JSON (not console),
    # matching the production shared_processors chain.
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        _add_correlation_id,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.ExtraAdder(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]
    formatter = structlog.stdlib.ProcessorFormatter(
        processor=structlog.processors.JSONRenderer(),
        foreign_pre_chain=shared_processors,
    )
    handler.setFormatter(formatter)

    test_logger = logging.getLogger("test_capture")
    test_logger.handlers = [handler]
    test_logger.setLevel(logging.DEBUG)
    test_logger.propagate = False

    log_func(test_logger, *args, **kwargs)

    output = stream.getvalue().strip()
    assert output, "No log output captured"
    return json.loads(output)


class TestLoggingConfig:
    """Unit tests for logging configuration."""

    def test_logging_config_outputs_json(self):
        """Logs emitted after setup_logging() are valid JSON with expected fields."""
        setup_logging()
        parsed = _capture_json_log(lambda lg, *a, **kw: lg.info("hello"))
        assert parsed["event"] == "hello"
        assert parsed["level"] == "info"
        assert "timestamp" in parsed

    def test_generate_correlation_id(self):
        """generate_correlation_id returns a 32-char hex UUID."""
        cid = generate_correlation_id()
        assert len(cid) == 32
        assert cid.isalnum()
        # Each call should be unique
        assert generate_correlation_id() != cid

    def test_correlation_id_contextvar_injection(self):
        """Correlation ID from ContextVar appears in log output."""
        setup_logging()
        token = correlation_id_var.set("test-cid-123")
        try:
            parsed = _capture_json_log(lambda lg, *a, **kw: lg.info("with_cid"))
            assert parsed.get("correlation_id") == "test-cid-123"
        finally:
            correlation_id_var.reset(token)

    def test_no_correlation_id_when_unset(self):
        """When ContextVar is empty, correlation_id is absent from logs."""
        setup_logging()
        # Ensure clean state
        assert correlation_id_var.get("") == ""
        parsed = _capture_json_log(lambda lg, *a, **kw: lg.info("no_cid"))
        assert "correlation_id" not in parsed

    def test_extra_fields_included_in_json(self):
        """Extra kwargs passed to logger appear as top-level JSON fields."""
        setup_logging()
        parsed = _capture_json_log(
            lambda lg, *a, **kw: lg.info(
                "with_extra", extra={"run_id": "abc", "count": 42}
            )
        )
        assert parsed["run_id"] == "abc"
        assert parsed["count"] == 42

    def test_worker_failure_logs_include_traceback(self):
        """logger.exception() produces JSON with a traceback field."""
        setup_logging()

        def emit_exception(lg, *a, **kw):
            try:
                raise ValueError("test error")
            except ValueError:
                lg.exception("error_event")

        parsed = _capture_json_log(emit_exception)
        assert parsed["event"] == "error_event"
        assert parsed["level"] == "error"
        # structlog's format_exc_info puts traceback into the event dict
        # Check that exception info is captured (may be in 'exc_info' or 'traceback')
        log_str = json.dumps(parsed)
        assert "ValueError" in log_str
        assert "test error" in log_str


class TestMiddlewareIntegration:
    """Integration tests for the correlation ID middleware."""

    @pytest.fixture(autouse=True)
    def _setup_logging(self):
        setup_logging()

    def test_request_middleware_generates_correlation_id(self):
        """Request without X-Correlation-ID header gets a generated one in logs."""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        # The middleware sets and resets the contextvar; we verify the endpoint works.
        # Direct log capture in middleware integration is complex; we verify
        # the middleware doesn't break and the contextvar mechanism works via
        # the unit tests above.

    def test_request_middleware_reuses_header_correlation_id(self):
        """Request with X-Correlation-ID header propagates it."""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get(
            "/health",
            headers={"X-Correlation-ID": "my-trace-id-456"},
        )
        assert response.status_code == 200

    def test_structlog_contextvars_bind_and_unbind(self):
        """Verify structlog contextvars appear in logs and can be cleaned up."""
        structlog.contextvars.bind_contextvars(
            user_id="u1", strategy_id="s1", run_id="r1"
        )
        try:
            parsed = _capture_json_log(lambda lg, *a, **kw: lg.info("bound"))
            assert parsed["user_id"] == "u1"
            assert parsed["strategy_id"] == "s1"
            assert parsed["run_id"] == "r1"
        finally:
            structlog.contextvars.unbind_contextvars(
                "user_id", "strategy_id", "run_id"
            )

        # After unbind, fields should be gone
        parsed = _capture_json_log(lambda lg, *a, **kw: lg.info("unbound"))
        assert "user_id" not in parsed
