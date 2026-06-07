"""Unit tests for the activation service (issue #535).

These exercise the decision logic — is_first, idempotency, the consent gate,
and the payload shape — against a fake analytics sink, never real PostHog.
"""
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlmodel import Session

from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import PlanTier, User, UserTier
from app.services import activation


class FakeSink:
    """Records `track_backend_event` calls instead of dispatching to PostHog."""

    def __init__(self):
        self.calls: list[dict] = []

    def __call__(
        self,
        event_name,
        *,
        user_id,
        strategy_id,
        correlation_id,
        duration_ms=None,
        properties=None,
    ):
        self.calls.append(
            {
                "event_name": event_name,
                "user_id": user_id,
                "strategy_id": strategy_id,
                "correlation_id": correlation_id,
                "duration_ms": duration_ms,
                "properties": properties or {},
            }
        )


@pytest.fixture
def fake_sink(monkeypatch):
    sink = FakeSink()
    monkeypatch.setattr(activation, "track_backend_event", sink)
    return sink


def _make_user(session: Session, *, consent=None, activated_at=None) -> User:
    user = User(
        id=uuid4(),
        email=f"{uuid4()}@example.com",
        password_hash="$2b$12$test_hash",
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
        analytics_consent=consent,
        activated_at=activated_at,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _make_completed_run(session: Session, user: User, *, triggered_by="manual") -> BacktestRun:
    strategy = Strategy(
        id=uuid4(),
        user_id=user.id,
        name="Test Strategy",
        asset="BTC/USDT",
        timeframe="1d",
        auto_update_enabled=False,
        auto_update_lookback_days=30,
    )
    session.add(strategy)
    session.flush()

    version = StrategyVersion(
        id=uuid4(),
        strategy_id=strategy.id,
        version_number=1,
        definition_json={"blocks": []},
    )
    session.add(version)
    session.flush()

    run = BacktestRun(
        id=uuid4(),
        user_id=user.id,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        status="completed",
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 1, 31, tzinfo=timezone.utc),
        triggered_by=triggered_by,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


def test_first_completion_stamps_activated_at_and_emits_is_first_true(session, fake_sink):
    user = _make_user(session, consent="accepted")
    run = _make_completed_run(session, user)

    activation.record_activation(user, run, session, duration_ms=1234)

    assert user.activated_at is not None
    assert len(fake_sink.calls) == 1
    assert fake_sink.calls[0]["properties"]["is_first"] is True


def test_repeat_completion_emits_is_first_false_and_does_not_restamp(session, fake_sink):
    user = _make_user(session, consent="accepted", activated_at=datetime(2026, 1, 1, tzinfo=timezone.utc))
    stamped_at = user.activated_at
    run = _make_completed_run(session, user)

    activation.record_activation(user, run, session, duration_ms=1234)

    assert user.activated_at == stamped_at
    assert fake_sink.calls[0]["properties"]["is_first"] is False


def test_is_idempotent_across_retries_of_the_same_completion(session, fake_sink):
    user = _make_user(session, consent="accepted")
    run = _make_completed_run(session, user)

    activation.record_activation(user, run, session, duration_ms=1000)
    first_activated_at = user.activated_at

    activation.record_activation(user, run, session, duration_ms=1100)

    assert user.activated_at == first_activated_at
    assert [call["properties"]["is_first"] for call in fake_sink.calls] == [True, False]


def test_emits_when_consent_accepted(session, fake_sink):
    user = _make_user(session, consent="accepted")
    run = _make_completed_run(session, user)

    activation.record_activation(user, run, session, duration_ms=1234)

    assert len(fake_sink.calls) == 1


@pytest.mark.parametrize("consent", ["declined", None])
def test_emits_nothing_when_consent_is_not_accepted(session, fake_sink, consent):
    user = _make_user(session, consent=consent)
    run = _make_completed_run(session, user)

    activation.record_activation(user, run, session, duration_ms=1234)

    assert fake_sink.calls == []


def test_stamps_activated_at_even_when_consent_is_not_accepted(session, fake_sink):
    """activated_at is the DB-only activation anchor — it must not depend on
    consent, or pre-cutover activation (computed from the database per
    ADR-0007) would under-count decliners."""
    user = _make_user(session, consent="declined")
    run = _make_completed_run(session, user)

    activation.record_activation(user, run, session, duration_ms=1234)

    assert user.activated_at is not None
    assert fake_sink.calls == []


def test_payload_carries_the_documented_shape(session, fake_sink):
    user = _make_user(session, consent="accepted")
    run = _make_completed_run(session, user, triggered_by="auto")

    activation.record_activation(user, run, session, duration_ms=4321)

    call = fake_sink.calls[0]
    assert call["event_name"] == "backtest_completed"
    assert call["user_id"] == user.id
    assert call["strategy_id"] == run.strategy_id
    assert call["correlation_id"] == run.id
    assert call["duration_ms"] == 4321
    assert call["properties"] == {
        "is_first": True,
        "triggered_by": "auto",
        "run_id": str(run.id),
        "source": "server",
    }
