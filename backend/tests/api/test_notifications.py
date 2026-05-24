"""API tests for notifications endpoint — contract and param validation."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from uuid import uuid4

import pytest

from app.models.notification import Notification


class TestListNotificationsContract:
    def test_response_includes_total_field(self, client, auth_headers):
        res = client.get("/notifications/", headers=auth_headers)

        assert res.status_code == 200
        body = res.json()
        assert "total" in body
        assert "items" in body
        assert "unread_count" in body

    def test_no_params_returns_defaults(self, client, auth_headers):
        res = client.get("/notifications/", headers=auth_headers)

        assert res.status_code == 200

    def test_offset_and_limit_params_accepted(self, client, auth_headers):
        res = client.get("/notifications/?offset=0&limit=10", headers=auth_headers)

        assert res.status_code == 200

    def test_read_state_all_accepted(self, client, auth_headers):
        res = client.get("/notifications/?read_state=all", headers=auth_headers)

        assert res.status_code == 200

    def test_read_state_unread_accepted(self, client, auth_headers):
        res = client.get("/notifications/?read_state=unread", headers=auth_headers)

        assert res.status_code == 200

    def test_read_state_read_accepted(self, client, auth_headers):
        res = client.get("/notifications/?read_state=read", headers=auth_headers)

        assert res.status_code == 200

    def test_invalid_read_state_returns_422(self, client, auth_headers):
        res = client.get("/notifications/?read_state=invalid", headers=auth_headers)

        assert res.status_code == 422

    def test_negative_offset_returns_422(self, client, auth_headers):
        res = client.get("/notifications/?offset=-1", headers=auth_headers)

        assert res.status_code == 422

    def test_limit_above_100_returns_422(self, client, auth_headers):
        res = client.get("/notifications/?limit=101", headers=auth_headers)

        assert res.status_code == 422

    def test_limit_zero_returns_422(self, client, auth_headers):
        res = client.get("/notifications/?limit=0", headers=auth_headers)

        assert res.status_code == 422


class TestListNotificationsData:
    def test_total_matches_notification_count(self, client, auth_headers, session, user):
        session.add(Notification(user_id=user.id, type="info", title="T1", body="B1"))
        session.add(Notification(user_id=user.id, type="info", title="T2", body="B2"))
        session.commit()

        res = client.get("/notifications/?limit=1", headers=auth_headers)

        assert res.status_code == 200
        body = res.json()
        assert body["total"] == 2
        assert len(body["items"]) == 1

    def test_read_state_unread_filters_correctly(self, client, auth_headers, session, user):
        session.add(Notification(user_id=user.id, type="info", title="Unread", body="B", is_read=False))
        session.add(Notification(user_id=user.id, type="info", title="Read", body="B", is_read=True))
        session.commit()

        res = client.get("/notifications/?read_state=unread", headers=auth_headers)

        body = res.json()
        assert all(not item["is_read"] for item in body["items"])

    def test_archived_notifications_excluded(self, client, auth_headers, session, user):
        from datetime import datetime, timezone

        session.add(Notification(user_id=user.id, type="info", title="Active", body="B"))
        session.add(Notification(
            user_id=user.id,
            type="info",
            title="Archived",
            body="B",
            archived_at=datetime.now(timezone.utc),
        ))
        session.commit()

        res = client.get("/notifications/", headers=auth_headers)

        body = res.json()
        assert body["total"] == 1

    def test_archived_true_returns_only_archived(self, client, auth_headers, session, user):
        from datetime import datetime, timezone

        session.add(Notification(user_id=user.id, type="info", title="Active", body="B"))
        session.add(Notification(
            user_id=user.id,
            type="info",
            title="Archived",
            body="B",
            archived_at=datetime.now(timezone.utc),
        ))
        session.commit()

        res = client.get("/notifications/?archived=true", headers=auth_headers)

        body = res.json()
        assert body["total"] == 1
        assert body["items"][0]["title"] == "Archived"


class TestArchiveEndpoint:
    def test_archive_returns_204(self, client, auth_headers, session, user):
        n = Notification(user_id=user.id, type="info", title="T", body="B")
        session.add(n)
        session.commit()

        res = client.post(f"/notifications/{n.id}/archive", headers=auth_headers)

        assert res.status_code == 204

    def test_archive_cross_user_returns_404(self, client, auth_headers, session):
        from app.models.user import PlanTier, UserTier
        from app.core.security import hash_password
        other = __import__("app.models.user", fromlist=["User"]).User(
            id=uuid4(),
            email="other@example.com",
            password_hash=hash_password("Pass123!"),
            plan_tier=PlanTier.FREE,
            user_tier=__import__("app.models.user", fromlist=["UserTier"]).UserTier.STANDARD,
        )
        session.add(other)
        session.commit()
        n = Notification(user_id=other.id, type="info", title="T", body="B")
        session.add(n)
        session.commit()

        res = client.post(f"/notifications/{n.id}/archive", headers=auth_headers)

        assert res.status_code == 404


class TestUnarchiveEndpoint:
    def test_unarchive_returns_204(self, client, auth_headers, session, user):
        from datetime import datetime, timezone
        n = Notification(
            user_id=user.id, type="info", title="T", body="B",
            archived_at=datetime.now(timezone.utc),
        )
        session.add(n)
        session.commit()

        res = client.post(f"/notifications/{n.id}/unarchive", headers=auth_headers)

        assert res.status_code == 204

    def test_unarchive_cross_user_returns_404(self, client, auth_headers, session):
        from datetime import datetime, timezone
        from app.models.user import PlanTier, UserTier
        from app.core.security import hash_password
        other = __import__("app.models.user", fromlist=["User"]).User(
            id=uuid4(),
            email="other2@example.com",
            password_hash=hash_password("Pass123!"),
            plan_tier=PlanTier.FREE,
            user_tier=UserTier.STANDARD,
        )
        session.add(other)
        session.commit()
        n = Notification(
            user_id=other.id, type="info", title="T", body="B",
            archived_at=datetime.now(timezone.utc),
        )
        session.add(n)
        session.commit()

        res = client.post(f"/notifications/{n.id}/unarchive", headers=auth_headers)

        assert res.status_code == 404


class TestBulkAcknowledgeEndpoint:
    def test_bulk_acknowledge_returns_204(self, client, auth_headers, session, user):
        n1 = Notification(user_id=user.id, type="info", title="T1", body="B")
        n2 = Notification(user_id=user.id, type="info", title="T2", body="B")
        session.add(n1)
        session.add(n2)
        session.commit()

        res = client.post(
            "/notifications/bulk-acknowledge",
            headers=auth_headers,
            json={"ids": [str(n1.id), str(n2.id)]},
        )

        assert res.status_code == 204

    def test_bulk_acknowledge_empty_ids_returns_204(self, client, auth_headers):
        res = client.post(
            "/notifications/bulk-acknowledge",
            headers=auth_headers,
            json={"ids": []},
        )

        assert res.status_code == 204


class TestBulkArchiveEndpoint:
    def test_bulk_archive_returns_204(self, client, auth_headers, session, user):
        n1 = Notification(user_id=user.id, type="info", title="T1", body="B")
        n2 = Notification(user_id=user.id, type="info", title="T2", body="B")
        session.add(n1)
        session.add(n2)
        session.commit()

        res = client.post(
            "/notifications/bulk-archive",
            headers=auth_headers,
            json={"ids": [str(n1.id), str(n2.id)]},
        )

        assert res.status_code == 204

    def test_bulk_archive_empty_ids_returns_204(self, client, auth_headers):
        res = client.post(
            "/notifications/bulk-archive",
            headers=auth_headers,
            json={"ids": []},
        )

        assert res.status_code == 204
