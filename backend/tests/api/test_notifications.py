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
