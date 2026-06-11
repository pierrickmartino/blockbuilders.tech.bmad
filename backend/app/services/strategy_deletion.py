"""Strategy hard-delete cascade (ADR-0006 reject semantics).

Public interface:
    delete_strategy_cascade(strategy_id, user, session) -> None

Reject hard-deletes a strategy the user explicitly discarded, including its
auto-frozen version. Per ADR-0006 this is not a breach of version
immutability: a version is never mutated in place, and the auto-frozen
version of a discarded draft was never user-acknowledged.
"""
from __future__ import annotations

from uuid import UUID

from sqlmodel import Session, select

from app.models.alert_rule import AlertRule
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_draft import StrategyDraft
from app.models.strategy_tag_link import StrategyTagLink
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.services.exceptions import StrategyNotFound


def delete_strategy_cascade(strategy_id: UUID, user: User, session: Session) -> None:
    """Hard-delete a strategy and all rows that reference it.

    Removes alert rules, backtest runs, frozen versions, tag links, and the
    working copy before deleting the strategy itself. Safe to call on a
    strategy that is already partially deleted (e.g. some related rows
    removed already) — each delete is a no-op if no matching rows remain.

    Raises StrategyNotFound if no strategy with this id is owned by `user`.
    Does not commit — the caller owns the transaction boundary.
    """
    strategy = session.exec(
        select(Strategy).where(Strategy.id == strategy_id, Strategy.user_id == user.id)
    ).first()
    if not strategy:
        raise StrategyNotFound()

    session.query(AlertRule).filter(AlertRule.strategy_id == strategy_id).delete(
        synchronize_session=False
    )
    session.query(BacktestRun).filter(BacktestRun.strategy_id == strategy_id).delete(
        synchronize_session=False
    )
    session.query(StrategyVersion).filter(
        StrategyVersion.strategy_id == strategy_id
    ).delete(synchronize_session=False)
    session.query(StrategyTagLink).filter(
        StrategyTagLink.strategy_id == strategy_id
    ).delete(synchronize_session=False)
    session.query(StrategyDraft).filter(
        StrategyDraft.strategy_id == strategy_id
    ).delete(synchronize_session=False)
    session.query(Strategy).filter(Strategy.id == strategy_id).delete(
        synchronize_session=False
    )
