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


class TestListForUserSearchFilter:
    def test_q_matches_title(self, session: Session):
        user = make_user(session)
        session.add(Notification(user_id=user.id, type="info", title="BTC alert", body="body"))
        session.add(Notification(user_id=user.id, type="info", title="ETH update", body="body"))
        session.commit()

        result = NotificationRepository.list_for_user(session, user.id, q="BTC")

        assert result.total == 1
        assert result.items[0].title == "BTC alert"

    def test_q_matches_body(self, session: Session):
        user = make_user(session)
        session.add(Notification(user_id=user.id, type="info", title="T1", body="bitcoin transaction"))
        session.add(Notification(user_id=user.id, type="info", title="T2", body="unrelated"))
        session.commit()

        result = NotificationRepository.list_for_user(session, user.id, q="bitcoin")

        assert result.total == 1

    def test_q_is_case_insensitive(self, session: Session):
        user = make_user(session)
        session.add(Notification(user_id=user.id, type="info", title="btc price drop", body="body"))
        session.commit()

        result = NotificationRepository.list_for_user(session, user.id, q="BTC")

        assert result.total == 1

    def test_q_no_match_returns_empty(self, session: Session):
        user = make_user(session)
        session.add(Notification(user_id=user.id, type="info", title="ETH alert", body="body"))
        session.commit()

        result = NotificationRepository.list_for_user(session, user.id, q="XYZ_NOT_FOUND")

        assert result.total == 0

    def test_q_none_skips_search_filter(self, session: Session):
        user = make_user(session)
        session.add(Notification(user_id=user.id, type="info", title="A", body="B"))
        session.add(Notification(user_id=user.id, type="alert", title="C", body="D"))
        session.commit()

        result = NotificationRepository.list_for_user(session, user.id, q=None)

        assert result.total == 2


class TestListForUserTypeFilter:
    def test_single_type_filters_correctly(self, session: Session):
        user = make_user(session)
        session.add(Notification(user_id=user.id, type="alert", title="A", body="B"))
        session.add(Notification(user_id=user.id, type="system", title="C", body="D"))
        session.commit()

        result = NotificationRepository.list_for_user(session, user.id, types=["alert"])

        assert result.total == 1
        assert result.items[0].type == "alert"

    def test_multiple_types_or_combined(self, session: Session):
        user = make_user(session)
        session.add(Notification(user_id=user.id, type="alert", title="A", body="B"))
        session.add(Notification(user_id=user.id, type="system", title="C", body="D"))
        session.add(Notification(user_id=user.id, type="info", title="E", body="F"))
        session.commit()

        result = NotificationRepository.list_for_user(session, user.id, types=["alert", "system"])

        assert result.total == 2

    def test_unknown_type_returns_empty(self, session: Session):
        user = make_user(session)
        session.add(Notification(user_id=user.id, type="info", title="A", body="B"))
        session.commit()

        result = NotificationRepository.list_for_user(session, user.id, types=["unknown_type"])

        assert result.total == 0

    def test_empty_types_list_skips_type_filter(self, session: Session):
        user = make_user(session)
        session.add(Notification(user_id=user.id, type="alert", title="A", body="B"))
        session.add(Notification(user_id=user.id, type="system", title="C", body="D"))
        session.commit()

        result = NotificationRepository.list_for_user(session, user.id, types=[])

        assert result.total == 2


class TestListForUserDateRangeFilter:
    def test_from_dt_excludes_earlier_notifications(self, session: Session):
        from datetime import timedelta

        user = make_user(session)
        now = datetime.now(timezone.utc)
        old = Notification(
            user_id=user.id, type="info", title="Old", body="B",
            created_at=now - timedelta(days=10),
        )
        recent = Notification(
            user_id=user.id, type="info", title="Recent", body="B",
            created_at=now - timedelta(days=1),
        )
        session.add(old)
        session.add(recent)
        session.commit()

        result = NotificationRepository.list_for_user(
            session, user.id, from_dt=now - timedelta(days=3)
        )

        assert result.total == 1
        assert result.items[0].title == "Recent"

    def test_to_dt_excludes_later_notifications(self, session: Session):
        from datetime import timedelta

        user = make_user(session)
        now = datetime.now(timezone.utc)
        old = Notification(
            user_id=user.id, type="info", title="Old", body="B",
            created_at=now - timedelta(days=10),
        )
        recent = Notification(
            user_id=user.id, type="info", title="Recent", body="B",
            created_at=now,
        )
        session.add(old)
        session.add(recent)
        session.commit()

        result = NotificationRepository.list_for_user(
            session, user.id, to_dt=now - timedelta(days=3)
        )

        assert result.total == 1
        assert result.items[0].title == "Old"

    def test_from_dt_and_to_dt_range(self, session: Session):
        from datetime import timedelta

        user = make_user(session)
        now = datetime.now(timezone.utc)
        session.add(Notification(
            user_id=user.id, type="info", title="In range", body="B",
            created_at=now - timedelta(days=5),
        ))
        session.add(Notification(
            user_id=user.id, type="info", title="Too old", body="B",
            created_at=now - timedelta(days=20),
        ))
        session.add(Notification(
            user_id=user.id, type="info", title="Too new", body="B",
            created_at=now,
        ))
        session.commit()

        result = NotificationRepository.list_for_user(
            session,
            user.id,
            from_dt=now - timedelta(days=10),
            to_dt=now - timedelta(days=1),
        )

        assert result.total == 1
        assert result.items[0].title == "In range"


class TestListForUserCombinedFilters:
    def test_combined_unread_type_and_q(self, session: Session):
        user = make_user(session)
        # Match: unread, type=alert, title contains BTC
        session.add(Notification(
            user_id=user.id, type="alert", title="BTC price drop", body="body", is_read=False,
        ))
        # No match: read
        session.add(Notification(
            user_id=user.id, type="alert", title="BTC news", body="body", is_read=True,
        ))
        # No match: wrong type
        session.add(Notification(
            user_id=user.id, type="system", title="BTC system msg", body="body", is_read=False,
        ))
        # No match: wrong q
        session.add(Notification(
            user_id=user.id, type="alert", title="ETH alert", body="body", is_read=False,
        ))
        session.commit()

        result = NotificationRepository.list_for_user(
            session, user.id, read_state="unread", types=["alert"], q="BTC"
        )

        assert result.total == 1
        assert result.items[0].title == "BTC price drop"


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
