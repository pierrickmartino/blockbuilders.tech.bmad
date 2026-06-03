"""Version freezer: automatically freeze a strategy working copy as an immutable version.

Public interface:
    freeze_for_backtest(strategy, session) -> StrategyVersion

Content-deduplicates by comparing definition_json: identical working copy reuses the
latest version row; a changed working copy gets a new row with version_number = max + 1.
"""
from __future__ import annotations

import json

from sqlmodel import Session, select, func

from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.services.working_copy import get_or_create_working_copy


def freeze_for_backtest(strategy: Strategy, session: Session) -> StrategyVersion:
    """Return the version that matches the current working copy, freezing a new one if needed.

    Does NOT commit — the caller owns the transaction boundary.
    """
    working_copy = get_or_create_working_copy(strategy, session)

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
