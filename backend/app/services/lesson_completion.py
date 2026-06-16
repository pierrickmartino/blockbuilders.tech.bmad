"""Lesson completion resolver and write-once store."""
from uuid import UUID

from sqlmodel import Session, select

from app.data.curriculum_registry import CURRICULUM
from app.models.lesson_completion import LessonCompletion
from app.models.strategy import Strategy
from app.models.strategy_template import StrategyTemplate


def resolve_lesson_id_for_template(template_name: str) -> str | None:
    """Return the lesson_id whose template_name matches, or None."""
    for module in CURRICULUM["modules"]:
        for lesson in module["lessons"]:
            if lesson["template_name"] == template_name:
                return lesson["id"]
    return None


def _record_completion(user_id: UUID, lesson_id: str, session: Session) -> LessonCompletion:
    """Write-once: return existing record if already complete, else insert."""
    existing = session.exec(
        select(LessonCompletion).where(
            LessonCompletion.user_id == user_id,
            LessonCompletion.lesson_id == lesson_id,
        )
    ).first()
    if existing:
        return existing
    completion = LessonCompletion(user_id=user_id, lesson_id=lesson_id)
    session.add(completion)
    session.commit()
    session.refresh(completion)
    return completion


def on_verdict_viewed(
    strategy_id: UUID,
    user_id: UUID,
    session: Session,
) -> LessonCompletion | None:
    """Record durable lesson completion when user views a verdict.

    Returns the completion record if the strategy maps to a lesson,
    None otherwise. Safe to call multiple times — idempotent.
    """
    strategy = session.get(Strategy, strategy_id)
    if strategy is None or strategy.source_template_id is None:
        return None

    template = session.get(StrategyTemplate, strategy.source_template_id)
    if template is None:
        return None

    lesson_id = resolve_lesson_id_for_template(template.name)
    if lesson_id is None:
        return None

    return _record_completion(user_id, lesson_id, session)
