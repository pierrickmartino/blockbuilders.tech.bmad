"""API endpoints for notifications."""
from datetime import date, datetime, time, timezone
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.user import User
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import BulkIdsRequest, NotificationListResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=NotificationListResponse)
def list_notifications(
    offset: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    read_state: Literal["all", "unread", "read"] = Query("all"),
    archived: bool = Query(False),
    type: Annotated[list[str], Query()] = [],  # noqa: A002
    from_: Annotated[date | None, Query(alias="from")] = None,
    to_: Annotated[date | None, Query(alias="to")] = None,
    q: str | None = Query(None),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> NotificationListResponse:
    """List notifications for the current user with pagination and filtering."""
    from_dt = datetime.combine(from_, time.min, tzinfo=timezone.utc) if from_ else None
    to_dt = datetime.combine(to_, time.max, tzinfo=timezone.utc) if to_ else None

    page = NotificationRepository.list_for_user(
        session,
        user.id,
        offset=offset,
        limit=limit,
        read_state=read_state,
        archived=archived,
        types=list(type),
        from_dt=from_dt,
        to_dt=to_dt,
        q=q or None,
    )
    return NotificationListResponse(
        items=page.items,
        unread_count=page.unread_count,
        total=page.total,
    )


@router.post("/acknowledge-all", status_code=status.HTTP_204_NO_CONTENT)
def acknowledge_all_notifications(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Mark all unread notifications as read."""
    NotificationRepository.mark_all_read(session, user.id)


@router.post("/bulk-acknowledge", status_code=status.HTTP_204_NO_CONTENT)
def bulk_acknowledge_notifications(
    body: BulkIdsRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Mark a list of notifications as read; silently ignores foreign IDs."""
    NotificationRepository.bulk_acknowledge_ids(session, user.id, body.ids)


@router.post("/bulk-archive", status_code=status.HTTP_204_NO_CONTENT)
def bulk_archive_notifications(
    body: BulkIdsRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Archive a list of notifications; silently ignores foreign IDs."""
    NotificationRepository.bulk_archive_ids(session, user.id, body.ids)


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


@router.post("/{notification_id}/archive", status_code=status.HTTP_204_NO_CONTENT)
def archive_notification(
    notification_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Archive a notification (archive-implies-read)."""
    found = NotificationRepository.archive_one(session, notification_id, user.id)
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )


@router.post("/{notification_id}/unarchive", status_code=status.HTTP_204_NO_CONTENT)
def unarchive_notification(
    notification_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Restore an archived notification."""
    found = NotificationRepository.unarchive_one(session, notification_id, user.id)
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
