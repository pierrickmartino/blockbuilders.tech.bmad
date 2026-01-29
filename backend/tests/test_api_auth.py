"""Tests for authentication API endpoints."""
import os
from unittest.mock import patch, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"

from app.main import app
from app.core.database import get_session
from app.core.security import hash_password
from app.models.user import User, PlanTier, UserTier


@pytest.fixture(name="engine")
def engine_fixture():
    """Create test database engine."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine):
    """Create test database session."""
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session):
    """Create test client with database session override."""
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def existing_user(session: Session) -> User:
    """Create an existing user for login tests."""
    user = User(
        id=uuid4(),
        email="existing@example.com",
        password_hash=hash_password("CorrectPassword123!"),
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


class TestSignup:
    """Tests for user signup endpoint."""

    def test_signup_success(self, client: TestClient):
        """Valid signup should create user and return token."""
        response = client.post(
            "/api/auth/signup",
            json={
                "email": "newuser@example.com",
                "password": "SecurePassword123!",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "newuser@example.com"

    def test_signup_duplicate_email(self, client: TestClient, existing_user: User):
        """Signup with existing email should fail."""
        response = client.post(
            "/api/auth/signup",
            json={
                "email": existing_user.email,
                "password": "AnotherPassword123!",
            },
        )

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_signup_invalid_email(self, client: TestClient):
        """Signup with invalid email format should fail."""
        response = client.post(
            "/api/auth/signup",
            json={
                "email": "not-an-email",
                "password": "SecurePassword123!",
            },
        )

        assert response.status_code == 422  # Validation error

    def test_signup_short_password(self, client: TestClient):
        """Signup with too short password should fail."""
        response = client.post(
            "/api/auth/signup",
            json={
                "email": "newuser@example.com",
                "password": "short",
            },
        )

        assert response.status_code == 422


class TestLogin:
    """Tests for user login endpoint."""

    def test_login_success(self, client: TestClient, existing_user: User):
        """Valid credentials should return token."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": existing_user.email,
                "password": "CorrectPassword123!",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == existing_user.email

    def test_login_wrong_password(self, client: TestClient, existing_user: User):
        """Wrong password should return 401."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": existing_user.email,
                "password": "WrongPassword456!",
            },
        )

        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    def test_login_nonexistent_user(self, client: TestClient):
        """Login with nonexistent email should return 401."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": "nobody@example.com",
                "password": "AnyPassword123!",
            },
        )

        assert response.status_code == 401

    def test_login_returns_user_tier(self, client: TestClient, existing_user: User):
        """Login response should include user tier information."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": existing_user.email,
                "password": "CorrectPassword123!",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "plan_tier" in data["user"]
        assert "user_tier" in data["user"]


class TestGetCurrentUser:
    """Tests for current user endpoint."""

    def test_get_me_authenticated(self, client: TestClient, existing_user: User):
        """Authenticated request should return user data."""
        # First login to get token
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": existing_user.email,
                "password": "CorrectPassword123!",
            },
        )
        token = login_response.json()["token"]

        # Then get /me
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == existing_user.email

    def test_get_me_no_token(self, client: TestClient):
        """Request without token should return 401."""
        response = client.get("/api/auth/me")

        assert response.status_code == 401

    def test_get_me_invalid_token(self, client: TestClient):
        """Request with invalid token should return 401."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid-token"},
        )

        assert response.status_code == 401


class TestPasswordReset:
    """Tests for password reset flow."""

    @patch("app.api.auth.resend.Emails")
    def test_password_reset_request_existing_user(
        self, mock_emails, client: TestClient, existing_user: User
    ):
        """Password reset request should succeed for existing user."""
        mock_emails.return_value.send.return_value = MagicMock()

        response = client.post(
            "/api/auth/password-reset-request",
            json={"email": existing_user.email},
        )

        # Should return success even if email doesn't exist (security)
        assert response.status_code == 200

    def test_password_reset_request_nonexistent_user(self, client: TestClient):
        """Password reset for nonexistent email should still return 200."""
        response = client.post(
            "/api/auth/password-reset-request",
            json={"email": "nobody@example.com"},
        )

        # Should not reveal whether email exists
        assert response.status_code == 200

    def test_password_reset_invalid_token(self, client: TestClient):
        """Password reset with invalid token should fail."""
        response = client.post(
            "/api/auth/password-reset",
            json={
                "token": "invalid-token",
                "new_password": "NewPassword123!",
            },
        )

        assert response.status_code == 400
