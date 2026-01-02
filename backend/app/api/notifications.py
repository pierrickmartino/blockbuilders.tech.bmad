"""API endpoints for notifications."""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func, update

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationItem, NotificationListResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=NotificationListResponse)
def list_notifications(
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> NotificationListResponse:
    """List notifications for current user, unread first then newest."""
    # Query notifications: order by is_read ASC (unread=False first), then created_at DESC
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.is_read, Notification.created_at.desc())
        .limit(limit)
    ).all()

    # Count unread notifications
    unread_count = session.exec(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id,
            Notification.is_read == False,  # noqa: E712
        )
    ).one()

    # Convert to response items
    items = [
        NotificationItem(
            id=n.id,
            type=n.type,
            title=n.title,
            body=n.body,
            link_url=n.link_url,
            is_read=n.is_read,
            created_at=n.created_at,
        )
        for n in notifications
    ]

    return NotificationListResponse(items=items, unread_count=unread_count)


@router.post("/{notification_id}/acknowledge", status_code=status.HTTP_204_NO_CONTENT)
def acknowledge_notification(
    notification_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Mark a single notification as read."""
    # Find notification and verify ownership
    notification = session.exec(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        )
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    # Mark as read
    notification.is_read = True
    notification.acknowledged_at = datetime.now(timezone.utc)
    session.add(notification)
    session.commit()


@router.post("/acknowledge-all", status_code=status.HTTP_204_NO_CONTENT)
def acknowledge_all_notifications(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Mark all unread notifications as read."""
    # Update all unread notifications for this user
    now = datetime.now(timezone.utc)
    session.exec(
        update(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.is_read == False,  # noqa: E712
        )
        .values(is_read=True, acknowledged_at=now)
    )
    session.commit()
