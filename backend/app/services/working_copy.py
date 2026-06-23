"""Working copy lifecycle — single home for every ADR-0005 transition.

Public interface:
    create(strategy, session, *, definition=None) -> StrategyDraft
    get(strategy, session) -> StrategyDraft
    save(strategy, definition, session) -> StrategyDraft
    freeze(strategy, session) -> StrategyVersion

Every function flushes within the caller's session. The calling route or
worker owns the commit, so a freeze can be composed atomically with the
run creation that follows it (ADR-0005).

strategy_versions is written ONLY by freeze — nowhere else.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlmodel import Session, func, select

from app.models.strategy import Strategy
from app.models.strategy_draft import StrategyDraft
from app.models.strategy_version import StrategyVersion

DEFAULT_DEFINITION: dict[str, Any] = {"blocks": [], "connections": [], "meta": {}}


def create(
    strategy: Strategy,
    session: Session,
    *,
    definition: dict[str, Any] | None = None,
) -> StrategyDraft:
    """Eagerly create a working copy, seeded with DEFAULT_DEFINITION or the provided definition.

    Raises ValueError if a working copy already exists (eager-create is called once at
    strategy creation; calling it again indicates misuse rather than an upsert).
    Flushes; never commits.
    """
    existing = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    if existing:
        raise ValueError(
            f"working copy already exists for strategy {strategy.id}"
        )

    draft = StrategyDraft(
        strategy_id=strategy.id,
        definition_json=definition if definition is not None else DEFAULT_DEFINITION,
    )
    session.add(draft)
    session.flush()
    return draft


def get(strategy: Strategy, session: Session) -> StrategyDraft:
    """Return the working copy. Defensively seeds with DEFAULT_DEFINITION if absent.

    Flushes if a seed is created; never commits.
    """
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
    session.flush()
    return draft


def save(
    strategy: Strategy,
    definition: dict[str, Any],
    session: Session,
) -> StrategyDraft:
    """Overwrite the working copy definition (autosave path).

    Raises ValueError if no working copy exists — eager-create should have run first.
    Flushes; never commits.
    """
    draft = session.exec(
        select(StrategyDraft).where(StrategyDraft.strategy_id == strategy.id)
    ).first()
    if not draft:
        raise ValueError(
            f"no working copy for strategy {strategy.id} — call create first"
        )

    draft.definition_json = definition
    draft.updated_at = datetime.utcnow()
    session.add(draft)
    session.flush()
    return draft


def freeze(strategy: Strategy, session: Session) -> StrategyVersion:
    """Content-deduplicate the working copy against the latest version.

    If the working copy definition matches the latest version, that version is
    returned unchanged (no new row). Otherwise a new StrategyVersion is minted
    with version_number = max + 1 (or 1 for a brand-new strategy).

    Flushes; never commits. The caller owns the transaction boundary so a freeze
    can be composed atomically with the backtest run creation that follows it.
    """
    working_copy = get(strategy, session)

    latest = session.exec(
        select(StrategyVersion)
        .where(StrategyVersion.strategy_id == strategy.id)
        .order_by(StrategyVersion.version_number.desc())
    ).first()

    if latest and _definitions_equal(latest.definition_json, working_copy.definition_json):
        return latest

    next_number = (latest.version_number + 1) if latest else 1
    version = StrategyVersion(
        strategy_id=strategy.id,
        version_number=next_number,
        definition_json=working_copy.definition_json,
    )
    session.add(version)
    session.flush()
    return version


def _definitions_equal(a: dict, b: dict) -> bool:
    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
