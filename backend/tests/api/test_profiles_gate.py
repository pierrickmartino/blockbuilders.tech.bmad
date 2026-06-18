"""Integration tests for the social_features_enabled feature flag gate on /profiles/*.

ADR-0023: when the flag is off, all /profiles/* endpoints return 404 matching
the "profile not found" response so the gated state leaks no information.
When the flag is on, existing behavior is unchanged.
"""
import pytest
from app.core.config import settings
from app.models.user import User, PlanTier, UserTier
from uuid import uuid4
from app.core.security import hash_password


@pytest.fixture
def public_user(session):
    u = User(
        id=uuid4(),
        email="public@example.com",
        password_hash=hash_password("Password123!"),
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
        handle="publichUser",
        is_public=True,
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


# ── flag OFF ──────────────────────────────────────────────────────────────────

def test_get_public_profile_returns_404_when_flag_off(client, monkeypatch):
    monkeypatch.setattr(settings, "social_features_enabled", False)
    response = client.get("/profiles/anyone")
    assert response.status_code == 404
    assert response.json()["detail"] == "Profile not found"


def test_get_profile_settings_returns_404_when_flag_off(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "social_features_enabled", False)
    response = client.get("/profiles/me/settings", headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Profile not found"


def test_put_profile_settings_returns_404_when_flag_off(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "social_features_enabled", False)
    response = client.put("/profiles/me/settings", headers=auth_headers, json={})
    assert response.status_code == 404
    assert response.json()["detail"] == "Profile not found"


# ── flag ON ───────────────────────────────────────────────────────────────────

def test_get_profile_settings_returns_200_when_flag_on(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "social_features_enabled", True)
    response = client.get("/profiles/me/settings", headers=auth_headers)
    assert response.status_code == 200


def test_put_profile_settings_returns_200_when_flag_on(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "social_features_enabled", True)
    response = client.put("/profiles/me/settings", headers=auth_headers, json={"is_public": False})
    assert response.status_code == 200


def test_get_public_profile_resolves_when_flag_on(client, session, public_user, monkeypatch):
    monkeypatch.setattr(settings, "social_features_enabled", True)
    response = client.get(f"/profiles/{public_user.handle}")
    assert response.status_code == 200
    data = response.json()
    assert data["handle"] == public_user.handle
