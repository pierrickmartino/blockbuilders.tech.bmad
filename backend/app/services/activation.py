"""Activation service — the canonical first-completion signal (issue #535).

Single entry point the worker calls when a backtest run completes. It decides
whether this is the user's first-ever completed run (`is_first`), stamps the
`User.activated_at` anchor — kept distinct from `has_completed_onboarding`,
a UI summary-card flag (CONTEXT.md, ADR-0007) — gates emission on persisted
analytics consent, and builds the `backtest_completed` payload.

The decision (is_first, consent gate, payload) is isolated from PostHog I/O
so it can be exercised against a fake sink in tests; PostHog dispatch stays a
thin, fire-and-forget boundary (`app.services.analytics`).
"""

import logging
from datetime import datetime, timezone

from sqlmodel import Session

from app.models.backtest_run import BacktestRun
from app.models.user import User
from app.services.analytics import track_backend_event

logger = logging.getLogger(__name__)

ACTIVATION_EVENT_NAME = "backtest_completed"
ACTIVATION_SOURCE = "server"


def record_activation(
    user: User,
    run: BacktestRun,
    session: Session,
    duration_ms: int | None = None,
) -> None:
    """Stamp the activation anchor and emit the consent-gated activation event.

    `is_first` is true exactly once per user: the run that observes
    `activated_at is None`. The stamp is committed *before* dispatch — a
    crash between the two can only under-count `is_first: true` (a retry then
    correctly observes `is_first: false`), never double-count it. Dispatch
    itself is fire-and-forget and never raises.
    """
    is_first = user.activated_at is None

    if is_first:
        user.activated_at = datetime.now(timezone.utc)
        session.add(user)
        session.commit()

    if user.analytics_consent != "accepted":
        return

    track_backend_event(
        ACTIVATION_EVENT_NAME,
        user_id=user.id,
        strategy_id=run.strategy_id,
        correlation_id=run.id,
        duration_ms=duration_ms,
        properties={
            "is_first": is_first,
            "triggered_by": run.triggered_by,
            "run_id": str(run.id),
            "source": ACTIVATION_SOURCE,
        },
    )
