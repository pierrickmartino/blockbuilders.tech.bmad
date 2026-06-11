"""Tests for the strategy hard-delete cascade (ADR-0006 reject semantics)."""
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlmodel import Session, select

from app.models.alert_rule import AlertRule, AlertType
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_draft import StrategyDraft
from app.models.strategy_tag import StrategyTag
from app.models.strategy_tag_link import StrategyTagLink
from app.models.strategy_version import StrategyVersion
from app.models.user import PlanTier, User, UserTier
from app.services.exceptions import StrategyNotFound
from app.services.strategy_deletion import delete_strategy_cascade


def _make_user(session: Session) -> User:
    user = User(
        id=uuid4(),
        email=f"{uuid4()}@example.com",
        password_hash="$2b$12$test_hash",
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _make_full_strategy(session: Session, user: User) -> Strategy:
    """Create a strategy with a working copy, frozen version, backtest run,
    alert rule, and tag link — the full set of related rows the cascade owns."""
    strategy = Strategy(id=uuid4(), user_id=user.id, name="S1", asset="BTC/USDT", timeframe="1d")
    session.add(strategy)
    session.commit()

    draft = StrategyDraft(strategy_id=strategy.id, definition_json={"blocks": [], "connections": [], "meta": {}})
    session.add(draft)

    version = StrategyVersion(strategy_id=strategy.id, version_number=1, definition_json={"blocks": [], "connections": []})
    session.add(version)
    session.commit()
    session.refresh(version)

    run = BacktestRun(
        user_id=user.id,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        status="completed",
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 1, 10, tzinfo=timezone.utc),
    )
    session.add(run)

    alert = AlertRule(
        user_id=user.id,
        alert_type=AlertType.PERFORMANCE,
        strategy_id=strategy.id,
        metric="max_drawdown_pct",
        threshold_pct=10.0,
    )
    session.add(alert)

    tag = StrategyTag(id=uuid4(), user_id=user.id, name="Swing", name_lower="swing")
    session.add(tag)
    session.commit()

    link = StrategyTagLink(strategy_id=strategy.id, tag_id=tag.id)
    session.add(link)
    session.commit()

    return strategy


class TestDeleteStrategyCascade:
    def test_full_cascade_removes_strategy_and_all_related_rows(self, session: Session):
        user = _make_user(session)
        strategy = _make_full_strategy(session, user)
        strategy_id = strategy.id

        delete_strategy_cascade(strategy_id, user, session)
        session.commit()

        assert session.exec(select(Strategy).where(Strategy.id == strategy_id)).first() is None
        assert session.exec(select(StrategyDraft).where(StrategyDraft.strategy_id == strategy_id)).first() is None
        assert session.exec(select(StrategyVersion).where(StrategyVersion.strategy_id == strategy_id)).first() is None
        assert session.exec(select(BacktestRun).where(BacktestRun.strategy_id == strategy_id)).first() is None
        assert session.exec(select(AlertRule).where(AlertRule.strategy_id == strategy_id)).first() is None
        assert session.exec(select(StrategyTagLink).where(StrategyTagLink.strategy_id == strategy_id)).first() is None

    def test_raises_strategy_not_found_for_strategy_owned_by_another_user(self, session: Session):
        owner = _make_user(session)
        other_user = _make_user(session)
        strategy = _make_full_strategy(session, owner)

        with pytest.raises(StrategyNotFound):
            delete_strategy_cascade(strategy.id, other_user, session)

        # Nothing was removed
        assert session.exec(select(Strategy).where(Strategy.id == strategy.id)).first() is not None

    def test_raises_strategy_not_found_for_nonexistent_strategy(self, session: Session):
        user = _make_user(session)

        with pytest.raises(StrategyNotFound):
            delete_strategy_cascade(uuid4(), user, session)

    def test_idempotent_on_already_partially_deleted_strategy(self, session: Session):
        user = _make_user(session)
        strategy = _make_full_strategy(session, user)
        strategy_id = strategy.id

        # Simulate a strategy that already lost some related rows
        session.query(BacktestRun).filter(BacktestRun.strategy_id == strategy_id).delete(synchronize_session=False)
        session.query(AlertRule).filter(AlertRule.strategy_id == strategy_id).delete(synchronize_session=False)
        session.commit()

        delete_strategy_cascade(strategy_id, user, session)
        session.commit()

        assert session.exec(select(Strategy).where(Strategy.id == strategy_id)).first() is None
        assert session.exec(select(StrategyDraft).where(StrategyDraft.strategy_id == strategy_id)).first() is None
        assert session.exec(select(StrategyVersion).where(StrategyVersion.strategy_id == strategy_id)).first() is None
        assert session.exec(select(StrategyTagLink).where(StrategyTagLink.strategy_id == strategy_id)).first() is None

        # Calling again now raises, since the strategy no longer exists
        with pytest.raises(StrategyNotFound):
            delete_strategy_cascade(strategy_id, user, session)
