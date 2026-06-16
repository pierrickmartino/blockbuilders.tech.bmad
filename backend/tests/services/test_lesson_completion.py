"""Tests for lesson completion resolver and store."""
from uuid import uuid4

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

# All models must be imported before create_all so SQLAlchemy resolves FKs.
from app.models.user import User, PlanTier, UserTier
from app.models.strategy import Strategy, StrategyEntryPath
from app.models.strategy_template import StrategyTemplate
from app.models.lesson_completion import LessonCompletion


# ── Resolver ──────────────────────────────────────────────────────────────────


def test_resolver_returns_lesson_id_for_known_template():
    from app.services.lesson_completion import resolve_lesson_id_for_template

    assert resolve_lesson_id_for_template("RSI Oversold Bounce") == "lesson-1-rsi"


def test_resolver_returns_none_for_unknown_template():
    from app.services.lesson_completion import resolve_lesson_id_for_template

    assert resolve_lesson_id_for_template("Some Random Template") is None


# ── Store / trigger ───────────────────────────────────────────────────────────


@pytest.fixture
def db_session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def rsi_template(db_session):
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
    db_session.add(template)
    db_session.commit()
    db_session.refresh(template)
    return template


@pytest.fixture
def learner(db_session):
    user = User(
        id=uuid4(),
        email="learner@example.com",
        password_hash="x",
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
        max_strategies=10,
        max_backtests_per_day=50,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def rsi_clone(db_session, learner, rsi_template):
    strategy = Strategy(
        id=uuid4(),
        user_id=learner.id,
        name="My RSI Clone",
        asset="BTC/USDT",
        timeframe="1d",
        entry_path=StrategyEntryPath.TEMPLATE_CLONE,
        source_template_id=rsi_template.id,
    )
    db_session.add(strategy)
    db_session.commit()
    db_session.refresh(strategy)
    return strategy


def test_on_verdict_viewed_records_completion(db_session, learner, rsi_clone):
    from app.services.lesson_completion import on_verdict_viewed

    result = on_verdict_viewed(rsi_clone.id, learner.id, db_session)

    assert result is not None
    assert result.lesson_id == "lesson-1-rsi"
    assert result.user_id == learner.id
    assert result.completed_at is not None


def test_on_verdict_viewed_is_idempotent(db_session, learner, rsi_clone):
    from app.services.lesson_completion import on_verdict_viewed

    first = on_verdict_viewed(rsi_clone.id, learner.id, db_session)
    second = on_verdict_viewed(rsi_clone.id, learner.id, db_session)

    assert first is not None
    assert second is not None
    assert first.id == second.id
    assert first.completed_at == second.completed_at


def test_on_verdict_viewed_returns_none_for_strategy_without_template(db_session, learner):
    from app.services.lesson_completion import on_verdict_viewed

    strategy = Strategy(
        id=uuid4(),
        user_id=learner.id,
        name="Blank Canvas",
        asset="BTC/USDT",
        timeframe="1d",
    )
    db_session.add(strategy)
    db_session.commit()

    result = on_verdict_viewed(strategy.id, learner.id, db_session)

    assert result is None


def test_on_verdict_viewed_returns_none_when_template_not_in_curriculum(db_session, learner):
    from app.services.lesson_completion import on_verdict_viewed

    unknown_template = StrategyTemplate(
        id=uuid4(),
        name="Custom Strategy XYZ",
        description="d",
        logic_summary="l",
        use_cases=[],
        parameter_ranges={},
        definition_json={},
        asset="BTC/USDT",
        timeframe="1d",
    )
    db_session.add(unknown_template)

    strategy = Strategy(
        id=uuid4(),
        user_id=learner.id,
        name="Clone of Unknown",
        asset="BTC/USDT",
        timeframe="1d",
        entry_path=StrategyEntryPath.TEMPLATE_CLONE,
        source_template_id=unknown_template.id,
    )
    db_session.add(strategy)
    db_session.commit()

    result = on_verdict_viewed(strategy.id, learner.id, db_session)

    assert result is None


def test_lesson_completion_survives_strategy_deletion(db_session, learner, rsi_clone):
    from app.services.lesson_completion import on_verdict_viewed

    completion = on_verdict_viewed(rsi_clone.id, learner.id, db_session)
    assert completion is not None
    completion_id = completion.id

    # Delete the strategy
    db_session.delete(rsi_clone)
    db_session.commit()

    # Completion row must still exist
    surviving = db_session.get(LessonCompletion, completion_id)
    assert surviving is not None
    assert surviving.lesson_id == "lesson-1-rsi"
