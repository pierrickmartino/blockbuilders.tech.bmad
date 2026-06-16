from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.user import User
from app.schemas.lesson_completion import RecordVerdictViewedRequest, RecordVerdictViewedResponse
from app.services.lesson_completion import on_verdict_viewed

router = APIRouter(prefix="/lesson-completion", tags=["lesson-completion"])


@router.post("/record", response_model=RecordVerdictViewedResponse)
def record_verdict_viewed(
    body: RecordVerdictViewedRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> RecordVerdictViewedResponse:
    """Record durable lesson completion when the user views a verdict."""
    completion = on_verdict_viewed(body.strategy_id, user.id, session)
    if completion is None:
        return RecordVerdictViewedResponse()
    return RecordVerdictViewedResponse(
        lesson_id=completion.lesson_id,
        completed_at=completion.completed_at,
    )
