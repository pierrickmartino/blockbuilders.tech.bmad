"""Authed track endpoint — returns the user's literacy track view."""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.data.curriculum_registry import CURRICULUM
from app.models.lesson_completion import LessonCompletion
from app.models.user import User
from app.schemas.track import TrackView
from app.services.progress_assembly import assemble_track_view

router = APIRouter(prefix="/track", tags=["track"])


@router.get("", response_model=TrackView)
def get_track(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TrackView:
    """Return the literacy track view for the current user."""
    completions = session.exec(
        select(LessonCompletion).where(LessonCompletion.user_id == user.id)
    ).all()
    completed_ids = {c.lesson_id for c in completions}
    return assemble_track_view(completed_ids, CURRICULUM)
