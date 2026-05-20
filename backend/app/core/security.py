from datetime import datetime, timedelta, timezone
import secrets
from typing import TYPE_CHECKING

import bcrypt
from joserfc import jwk
from joserfc.jwt import encode as jwt_encode, decode as jwt_decode, JWTClaimsRegistry
from joserfc.errors import JoseError

from app.core.config import settings

if TYPE_CHECKING:
    from app.models.user import User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    key = jwk.import_key(settings.jwt_secret_key, "oct")
    return jwt_encode(
        {"alg": settings.jwt_algorithm},
        {"sub": user_id, "exp": int(expire.timestamp())},
        key,
    )


def decode_access_token(token: str) -> str | None:
    try:
        key = jwk.import_key(settings.jwt_secret_key, "oct")
        # FEAT-106: keep an explicit algorithm allowlist to prevent JWT algorithm confusion.
        decoded = jwt_decode(token, key, algorithms=[settings.jwt_algorithm])
        JWTClaimsRegistry().validate(decoded.claims)
        return decoded.claims.get("sub")
    except JoseError:
        return None


def generate_reset_token() -> str:
    """Generate a secure random token for password reset."""
    return secrets.token_urlsafe(32)


def is_reset_token_valid(user: "User", token: str) -> bool:
    """Check if the reset token is valid and not expired.

    Uses constant-time comparison to prevent timing attacks.
    """
    if not user.reset_token or not user.reset_token_expires_at:
        return False
    # Use constant-time comparison to prevent timing attacks
    if not secrets.compare_digest(user.reset_token, token):
        return False
    # Ensure timezone-aware comparison
    expires_at = user.reset_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        return False
    return True
