from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from app.models.strategy import Strategy
from app.models.strategy_draft import StrategyDraft

DEFAULT_DEFINITION: dict[str, Any] = {"blocks": [], "connections": [], "meta": {}}


def get_or_create_working_copy(strategy: Strategy, session: Session) -> StrategyDraft:
    """Return the working copy for a strategy, creating it with the default definition if absent."""
    draft = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    if draft:
        return draft

    draft = StrategyDraft(
        strategy_id=strategy.id,
        definition_json=DEFAULT_DEFINITION,
    )
    session.add(draft)
    session.commit()
    session.refresh(draft)
    return draft


def upsert_working_copy(
    strategy: Strategy,
    definition: dict[str, Any],
    session: Session,
) -> StrategyDraft:
    """Overwrite the working copy's definition_json, creating the row if absent."""
    draft = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()

    if draft:
        draft.definition_json = definition
        draft.updated_at = datetime.utcnow()
        session.add(draft)
    else:
        draft = StrategyDraft(
            strategy_id=strategy.id,
            definition_json=definition,
        )
        session.add(draft)

    session.commit()
    session.refresh(draft)
    return draft
