"""Structured JSON logging configuration for API and worker processes."""

import logging
import sys
import uuid
from contextvars import ContextVar

import structlog

# Context variable for correlation ID — set by middleware or worker jobs.
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


def _add_correlation_id(
    logger: logging.Logger,
    method_name: str,
    event_dict: dict,
) -> dict:
    """Inject correlation_id from contextvars into every log event."""
    cid = correlation_id_var.get("")
    if cid:
        event_dict.setdefault("correlation_id", cid)
    return event_dict


def generate_correlation_id() -> str:
    """Generate a new correlation ID (UUID4 hex string)."""
    return uuid.uuid4().hex


def setup_logging(*, log_level: str = "INFO") -> None:
    """Configure structlog + stdlib for JSON output to stdout.

    Safe to call multiple times (idempotent). Call once at app/worker startup.
    """
    shared_processors: list[structlog.types.Processor] = [
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

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    renderer = (
        structlog.dev.ConsoleRenderer()
        if sys.stderr.isatty()
        else structlog.processors.JSONRenderer()
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processor=renderer,
        foreign_pre_chain=shared_processors,
    )

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
