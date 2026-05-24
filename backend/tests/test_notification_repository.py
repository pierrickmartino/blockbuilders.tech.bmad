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


class TestArchiveOne:
    def test_archive_sets_all_three_fields(self, session: Session):
        user = make_user(session)
        n = make_notification(session, user, is_read=False)

        result = NotificationRepository.archive_one(session, n.id, user.id)

        assert result is True
        session.refresh(n)
        assert n.archived_at is not None
        assert n.is_read is True
        assert n.acknowledged_at is not None

    def test_archive_is_idempotent_on_already_archived(self, session: Session):
        user = make_user(session)
        n = make_notification(session, user, archived=True, is_read=True)

        result = NotificationRepository.archive_one(session, n.id, user.id)

        assert result is True
        session.refresh(n)
        assert n.archived_at is not None
        assert n.is_read is True

    def test_archive_cross_user_returns_false(self, session: Session):
        user_a = make_user(session)
        user_b = make_user(session)
        n = make_notification(session, user_a)

        result = NotificationRepository.archive_one(session, n.id, user_b.id)

        assert result is False
        session.refresh(n)
        assert n.archived_at is None


class TestUnarchiveOne:
    def test_unarchive_clears_archived_at(self, session: Session):
        user = make_user(session)
        n = make_notification(session, user, archived=True)

        result = NotificationRepository.unarchive_one(session, n.id, user.id)

        assert result is True
        session.refresh(n)
        assert n.archived_at is None

    def test_unarchive_leaves_is_read_alone(self, session: Session):
        user = make_user(session)
        n = make_notification(session, user, archived=True, is_read=True)

        NotificationRepository.unarchive_one(session, n.id, user.id)

        session.refresh(n)
        assert n.is_read is True

    def test_unarchive_cross_user_returns_false(self, session: Session):
        user_a = make_user(session)
        user_b = make_user(session)
        n = make_notification(session, user_a, archived=True)

        result = NotificationRepository.unarchive_one(session, n.id, user_b.id)

        assert result is False


class TestBulkAcknowledgeIds:
    def test_bulk_acknowledge_marks_ids_as_read(self, session: Session):
        user = make_user(session)
        n1 = make_notification(session, user, is_read=False)
        n2 = make_notification(session, user, is_read=False)

        NotificationRepository.bulk_acknowledge_ids(session, user.id, [n1.id, n2.id])

        session.refresh(n1)
        session.refresh(n2)
        assert n1.is_read is True
        assert n2.is_read is True

    def test_bulk_acknowledge_ignores_foreign_user_ids(self, session: Session):
        user_a = make_user(session)
        user_b = make_user(session)
        n = make_notification(session, user_b, is_read=False)

        NotificationRepository.bulk_acknowledge_ids(session, user_a.id, [n.id])

        session.refresh(n)
        assert n.is_read is False

    def test_bulk_acknowledge_is_idempotent(self, session: Session):
        user = make_user(session)
        n = make_notification(session, user, is_read=True)

        NotificationRepository.bulk_acknowledge_ids(session, user.id, [n.id])

        session.refresh(n)
        assert n.is_read is True


class TestBulkArchiveIds:
    def test_bulk_archive_applies_archive_implies_read(self, session: Session):
        user = make_user(session)
        n1 = make_notification(session, user, is_read=False)
        n2 = make_notification(session, user, is_read=False)

        NotificationRepository.bulk_archive_ids(session, user.id, [n1.id, n2.id])

        session.refresh(n1)
        session.refresh(n2)
        assert n1.archived_at is not None
        assert n1.is_read is True
        assert n2.archived_at is not None
        assert n2.is_read is True

    def test_bulk_archive_ignores_foreign_user_ids(self, session: Session):
        user_a = make_user(session)
        user_b = make_user(session)
        n = make_notification(session, user_b)

        NotificationRepository.bulk_archive_ids(session, user_a.id, [n.id])

        session.refresh(n)
        assert n.archived_at is None


class TestListForUserArchivedParam:
    def test_archived_true_returns_only_archived_rows(self, session: Session):
        user = make_user(session)
        make_notification(session, user)
        make_notification(session, user, archived=True)

        result = NotificationRepository.list_for_user(session, user.id, archived=True)

        assert len(result.items) == 1

    def test_archived_false_excludes_archived_rows(self, session: Session):
        user = make_user(session)
        make_notification(session, user)
        make_notification(session, user, archived=True)

        result = NotificationRepository.list_for_user(session, user.id, archived=False)

        assert len(result.items) == 1

    def test_archived_rows_ordered_by_archived_at_desc(self, session: Session):
        from datetime import timedelta

        user = make_user(session)
        now = datetime.now(timezone.utc)
        old = Notification(
            id=uuid4(), user_id=user.id, type="info", title="Old", body="B",
            archived_at=now - timedelta(hours=2),
        )
        new_ = Notification(
            id=uuid4(), user_id=user.id, type="info", title="New", body="B",
            archived_at=now,
        )
        session.add(old)
        session.add(new_)
        session.commit()

        result = NotificationRepository.list_for_user(session, user.id, archived=True)

        assert result.items[0].title == "New"
        assert result.items[1].title == "Old"
