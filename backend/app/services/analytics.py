"""Backend analytics helper for PostHog server-side event tracking."""

import logging
from datetime import datetime, timezone
from uuid import UUID

from posthog import Posthog

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Posthog | None = None


def _get_client() -> Posthog | None:
    """Lazy-initialize the PostHog client singleton."""
    global _client
    if _client is not None:
        return _client
    if not settings.posthog_api_key:
        return None
    _client = Posthog(settings.posthog_api_key, host=settings.posthog_host)
    return _client


def track_backend_event(
    event_name: str,
    user_id: UUID,
    strategy_id: UUID,
    correlation_id: UUID,
    duration_ms: int | None = None,
) -> None:
    """Fire-and-forget backend event dispatch to PostHog.

    Safe no-op when PostHog is not configured.
    Never raises — dispatch failures are logged and swallowed.
    """
    client = _get_client()
    if client is None:
        return

    if not user_id or not strategy_id or not correlation_id:
        logger.warning(
            "Skipping analytics event %s: missing required field "
            "(user_id=%s, strategy_id=%s, correlation_id=%s)",
            event_name,
            user_id,
            strategy_id,
            correlation_id,
        )
        return

    try:
        client.capture(
            distinct_id=str(user_id),
            event=event_name,
            properties={
                "correlation_id": str(correlation_id),
                "user_id": str(user_id),
                "strategy_id": str(strategy_id),
                "duration_ms": duration_ms,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
    except Exception:
        logger.exception("Failed to emit analytics event %s", event_name)
