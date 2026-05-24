"""API endpoints for notifications."""
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.user import User
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import NotificationListResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=NotificationListResponse)
def list_notifications(
    offset: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    read_state: Literal["all", "unread", "read"] = Query("all"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> NotificationListResponse:
    """List notifications for the current user with pagination and read-state filtering."""
    page = NotificationRepository.list_for_user(
        session,
        user.id,
        offset=offset,
        limit=limit,
        read_state=read_state,
    )
    return NotificationListResponse(
        items=page.items,
        unread_count=page.unread_count,
        total=page.total,
    )


@router.post("/{notification_id}/acknowledge", status_code=status.HTTP_204_NO_CONTENT)
def acknowledge_notification(
    notification_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Mark a single notification as read."""
    found = NotificationRepository.mark_read(session, notification_id, user.id)
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )


@router.post("/acknowledge-all", status_code=status.HTTP_204_NO_CONTENT)
def acknowledge_all_notifications(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Mark all unread notifications as read."""
    NotificationRepository.mark_all_read(session, user.id)
