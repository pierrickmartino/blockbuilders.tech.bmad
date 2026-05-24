"""Tests for NotificationRepository — RED first, then implement."""
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool

import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from app.models.notification import Notification
from app.models.user import User, PlanTier, UserTier
from app.repositories.notification_repository import NotificationRepository


@pytest.fixture
def engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def session(engine):
    with Session(engine) as s:
        yield s


def make_user(session: Session) -> User:
    u = User(
        id=uuid4(),
        email=f"{uuid4()}@example.com",
        password_hash="$2b$12$test",
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


def make_notification(session: Session, user: User, *, is_read: bool = False, archived: bool = False) -> Notification:
    now = datetime.now(timezone.utc)
    n = Notification(
        id=uuid4(),
        user_id=user.id,
        type="info",
        title="Test",
        body="Body",
        is_read=is_read,
        archived_at=now if archived else None,
    )
    session.add(n)
    session.commit()
    session.refresh(n)
    return n


class TestListForUser:
    def test_returns_only_non_archived_by_default(self, session: Session):
        user = make_user(session)
        make_notification(session, user)
        make_notification(session, user, archived=True)

        result = NotificationRepository.list_for_user(session, user.id, offset=0, limit=25, read_state="all")

        assert len(result.items) == 1

    def test_filters_unread(self, session: Session):
        user = make_user(session)
        make_notification(session, user, is_read=False)
        make_notification(session, user, is_read=True)

        result = NotificationRepository.list_for_user(session, user.id, offset=0, limit=25, read_state="unread")

        assert len(result.items) == 1
        assert result.items[0].is_read is False

    def test_filters_read(self, session: Session):
        user = make_user(session)
        make_notification(session, user, is_read=False)
        make_notification(session, user, is_read=True)

        result = NotificationRepository.list_for_user(session, user.id, offset=0, limit=25, read_state="read")

        assert len(result.items) == 1
        assert result.items[0].is_read is True

    def test_paginates_with_offset_and_limit(self, session: Session):
        user = make_user(session)
        for _ in range(5):
            make_notification(session, user)

        first_page = NotificationRepository.list_for_user(session, user.id, offset=0, limit=3, read_state="all")
        second_page = NotificationRepository.list_for_user(session, user.id, offset=3, limit=3, read_state="all")

        assert len(first_page.items) == 3
        assert len(second_page.items) == 2

    def test_total_reflects_full_count_not_page_size(self, session: Session):
        user = make_user(session)
        for _ in range(5):
            make_notification(session, user)

        result = NotificationRepository.list_for_user(session, user.id, offset=0, limit=2, read_state="all")

        assert result.total == 5

    def test_cross_user_isolation(self, session: Session):
        user_a = make_user(session)
        user_b = make_user(session)
        make_notification(session, user_a)
        make_notification(session, user_b)

        result_a = NotificationRepository.list_for_user(session, user_a.id, offset=0, limit=25, read_state="all")
        result_b = NotificationRepository.list_for_user(session, user_b.id, offset=0, limit=25, read_state="all")

        assert result_a.total == 1
        assert result_b.total == 1

    def test_unread_count_excludes_archived_rows(self, session: Session):
        user = make_user(session)
        make_notification(session, user, is_read=False)
        make_notification(session, user, is_read=False, archived=True)

        result = NotificationRepository.list_for_user(session, user.id, offset=0, limit=25, read_state="all")

        assert result.unread_count == 1

    def test_all_read_state_returns_both_read_and_unread(self, session: Session):
        user = make_user(session)
        make_notification(session, user, is_read=False)
        make_notification(session, user, is_read=True)

        result = NotificationRepository.list_for_user(session, user.id, offset=0, limit=25, read_state="all")

        assert result.total == 2
