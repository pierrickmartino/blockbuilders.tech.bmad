"""Tests for authentication and security functions."""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    generate_reset_token,
    is_reset_token_valid,
)


class TestPasswordHashing:
    """Tests for password hashing and verification."""

    def test_hash_password_produces_bcrypt_hash(self):
        """Hash should be a valid bcrypt hash starting with $2b$."""
        password = "SecurePassword123!"
        hashed = hash_password(password)

        assert hashed.startswith("$2b$")
        assert len(hashed) == 60  # bcrypt hash length

    def test_hash_password_different_salts(self):
        """Same password should produce different hashes (different salts)."""
        password = "SecurePassword123!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        assert hash1 != hash2

    def test_verify_password_correct(self):
        """Correct password should verify successfully."""
        password = "SecurePassword123!"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Incorrect password should fail verification."""
        password = "SecurePassword123!"
        wrong_password = "WrongPassword456!"
        hashed = hash_password(password)

        assert verify_password(wrong_password, hashed) is False

    def test_verify_password_empty_string(self):
        """Empty password should fail verification against non-empty hash."""
        password = "SecurePassword123!"
        hashed = hash_password(password)

        assert verify_password("", hashed) is False

    def test_hash_password_unicode(self):
        """Unicode characters in password should be handled correctly."""
        password = "Pässwörd123!日本語"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True


class TestJWTTokens:
    """Tests for JWT token creation and validation."""

    def test_create_access_token_returns_string(self):
        """Token should be a non-empty string."""
        user_id = "test-user-id-123"
        token = create_access_token(user_id)

        assert isinstance(token, str)
        assert len(token) > 0

    def test_decode_access_token_returns_user_id(self):
        """Valid token should decode to correct user ID."""
        user_id = "test-user-id-123"
        token = create_access_token(user_id)
        decoded = decode_access_token(token)

        assert decoded == user_id

    def test_decode_invalid_token_returns_none(self):
        """Invalid token should return None."""
        invalid_token = "invalid.token.here"
        decoded = decode_access_token(invalid_token)

        assert decoded is None

    def test_decode_tampered_token_returns_none(self):
        """Tampered token should return None."""
        user_id = "test-user-id-123"
        token = create_access_token(user_id)
        # Tamper with the token
        tampered = token[:-5] + "XXXXX"
        decoded = decode_access_token(tampered)

        assert decoded is None

    def test_decode_empty_token_returns_none(self):
        """Empty token should return None."""
        decoded = decode_access_token("")

        assert decoded is None

    def test_tokens_for_different_users_are_different(self):
        """Different users should get different tokens."""
        token1 = create_access_token("user-1")
        token2 = create_access_token("user-2")

        assert token1 != token2


class TestResetTokens:
    """Tests for password reset token generation and validation."""

    def test_generate_reset_token_returns_string(self):
        """Reset token should be a non-empty string."""
        token = generate_reset_token()

        assert isinstance(token, str)
        assert len(token) > 20  # Should be reasonably long

    def test_generate_reset_token_unique(self):
        """Each generated token should be unique."""
        tokens = [generate_reset_token() for _ in range(100)]

        assert len(set(tokens)) == 100  # All unique

    def test_generate_reset_token_url_safe(self):
        """Reset token should be URL-safe (no special URL characters)."""
        token = generate_reset_token()

        # URL-safe characters only
        assert all(c.isalnum() or c in "-_" for c in token)

    def test_is_reset_token_valid_correct_token(self):
        """Valid token within expiry should return True."""
        user = MagicMock()
        token = "valid-token-123"
        user.reset_token = token
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        assert is_reset_token_valid(user, token) is True

    def test_is_reset_token_valid_wrong_token(self):
        """Wrong token should return False."""
        user = MagicMock()
        user.reset_token = "correct-token"
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        assert is_reset_token_valid(user, "wrong-token") is False

    def test_is_reset_token_valid_expired(self):
        """Expired token should return False."""
        user = MagicMock()
        token = "expired-token"
        user.reset_token = token
        user.reset_token_expires_at = datetime.now(timezone.utc) - timedelta(hours=1)

        assert is_reset_token_valid(user, token) is False

    def test_is_reset_token_valid_no_token_stored(self):
        """User with no stored token should return False."""
        user = MagicMock()
        user.reset_token = None
        user.reset_token_expires_at = None

        assert is_reset_token_valid(user, "any-token") is False

    def test_is_reset_token_valid_naive_datetime(self):
        """Should handle naive datetime (no timezone) correctly."""
        user = MagicMock()
        token = "valid-token"
        user.reset_token = token
        # Naive datetime (no tzinfo) - should be treated as UTC
        user.reset_token_expires_at = datetime.utcnow() + timedelta(hours=1)

        assert is_reset_token_valid(user, token) is True
