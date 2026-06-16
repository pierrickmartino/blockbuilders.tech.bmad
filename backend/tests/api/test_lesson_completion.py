"""Tests for POST /lesson-completion/record endpoint."""
from uuid import uuid4

import pytest

from app.models.strategy import Strategy, StrategyEntryPath
from app.models.strategy_template import StrategyTemplate


@pytest.fixture
def rsi_template(session):
    template = StrategyTemplate(
        id=uuid4(),
        name="RSI Oversold Bounce",
        description="d",
        logic_summary="l",
        use_cases=["swing"],
        parameter_ranges={},
        definition_json={},
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(template)
    session.commit()
    session.refresh(template)
    return template


@pytest.fixture
def rsi_clone(session, user, rsi_template):
    strategy = Strategy(
        id=uuid4(),
        user_id=user.id,
        name="My RSI Clone",
        asset="BTC/USDT",
        timeframe="1d",
        entry_path=StrategyEntryPath.TEMPLATE_CLONE,
        source_template_id=rsi_template.id,
    )
    session.add(strategy)
    session.commit()
    session.refresh(strategy)
    return strategy


@pytest.fixture
def blank_strategy(session, user):
    strategy = Strategy(
        id=uuid4(),
        user_id=user.id,
        name="Blank Canvas",
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(strategy)
    session.commit()
    session.refresh(strategy)
    return strategy


# ── Tests ─────────────────────────────────────────────────────────────────────


def test_record_verdict_viewed_unauthenticated(client, rsi_clone):
    res = client.post("/lesson-completion/record", json={"strategy_id": str(rsi_clone.id)})
    assert res.status_code == 401


def test_record_verdict_viewed_records_lesson(client, auth_headers, rsi_clone):
    res = client.post(
        "/lesson-completion/record",
        json={"strategy_id": str(rsi_clone.id)},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["lesson_id"] == "lesson-1-rsi"
    assert data["completed_at"] is not None


def test_record_verdict_viewed_non_lesson_strategy_returns_null(client, auth_headers, blank_strategy):
    res = client.post(
        "/lesson-completion/record",
        json={"strategy_id": str(blank_strategy.id)},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["lesson_id"] is None
    assert data["completed_at"] is None
