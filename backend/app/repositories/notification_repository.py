"""Owns all notification queries and state transitions."""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from sqlmodel import Session, func, select

from app.models.notification import Notification
from app.schemas.notification import NotificationItem


ReadState = Literal["all", "unread", "read"]


@dataclass(frozen=True)
class NotificationPage:
    items: list[NotificationItem]
    total: int
    unread_count: int


class NotificationRepository:
    @staticmethod
    def list_for_user(
        session: Session,
        user_id: UUID,
        *,
        offset: int = 0,
        limit: int = 25,
        read_state: ReadState = "all",
        archived: bool = False,
    ) -> NotificationPage:
        if archived:
            base = select(Notification).where(
                Notification.user_id == user_id,
                Notification.archived_at.is_not(None),
            )
        else:
            base = select(Notification).where(
                Notification.user_id == user_id,
                Notification.archived_at.is_(None),
            )
            if read_state == "unread":
                base = base.where(Notification.is_read == False)  # noqa: E712
            elif read_state == "read":
                base = base.where(Notification.is_read == True)  # noqa: E712

        total = session.exec(
            select(func.count()).select_from(base.subquery())
        ).one()

        if archived:
            ordered = base.order_by(Notification.archived_at.desc())
        else:
            ordered = base.order_by(Notification.is_read, Notification.created_at.desc())

        rows = session.exec(ordered.offset(offset).limit(limit)).all()

        unread_count = session.exec(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.archived_at.is_(None),
                Notification.is_read == False,  # noqa: E712
            )
        ).one()

        items = [
            NotificationItem(
                id=n.id,
                type=n.type,
                title=n.title,
                body=n.body,
                link_url=n.link_url,
                is_read=n.is_read,
                created_at=n.created_at,
                archived_at=n.archived_at,
            )
            for n in rows
        ]

        return NotificationPage(items=items, total=total, unread_count=unread_count)

    @staticmethod
    def mark_read(session: Session, notification_id: UUID, user_id: UUID) -> bool:
        """Returns False if not found or owned by another user."""
        notification = session.exec(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        ).first()

        if not notification:
            return False

        notification.is_read = True
        notification.acknowledged_at = datetime.now(timezone.utc)
        session.add(notification)
        session.commit()
        return True

    @staticmethod
    def mark_all_read(session: Session, user_id: UUID) -> None:
        rows = session.exec(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
        ).all()
        now = datetime.now(timezone.utc)
        for n in rows:
            n.is_read = True
            n.acknowledged_at = now
            session.add(n)
        session.commit()

    @staticmethod
    def archive_one(session: Session, notification_id: UUID, user_id: UUID) -> bool:
        """Archive-implies-read in one transaction. Returns False if not found."""
        n = session.exec(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        ).first()
        if not n:
            return False
        now = datetime.now(timezone.utc)
        n.archived_at = now
        n.is_read = True
        if not n.acknowledged_at:
            n.acknowledged_at = now
        session.add(n)
        session.commit()
        return True

    @staticmethod
    def unarchive_one(session: Session, notification_id: UUID, user_id: UUID) -> bool:
        """Clear archived_at; leaves read state untouched. Returns False if not found."""
        n = session.exec(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        ).first()
        if not n:
            return False
        n.archived_at = None
        session.add(n)
        session.commit()
        return True

    @staticmethod
    def bulk_acknowledge_ids(
        session: Session, user_id: UUID, ids: list[UUID]
    ) -> None:
        """Mark specified notifications as read; silently ignores foreign IDs."""
        if not ids:
            return
        rows = session.exec(
            select(Notification).where(
                Notification.id.in_(ids),
                Notification.user_id == user_id,
            )
        ).all()
        now = datetime.now(timezone.utc)
        for n in rows:
            if not n.is_read:
                n.is_read = True
                n.acknowledged_at = now
                session.add(n)
        session.commit()

    @staticmethod
    def bulk_archive_ids(
        session: Session, user_id: UUID, ids: list[UUID]
    ) -> None:
        """Archive notifications with archive-implies-read; silently ignores foreign IDs."""
        if not ids:
            return
        rows = session.exec(
            select(Notification).where(
                Notification.id.in_(ids),
                Notification.user_id == user_id,
            )
        ).all()
        now = datetime.now(timezone.utc)
        for n in rows:
            n.archived_at = now
            n.is_read = True
            if not n.acknowledged_at:
                n.acknowledged_at = now
            session.add(n)
        session.commit()
