from datetime import datetime, timedelta, timezone
import secrets
from typing import TYPE_CHECKING

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

if TYPE_CHECKING:
    from app.models.user import User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        return payload.get("sub")
    except JWTError:
        return None


def generate_reset_token() -> str:
    """Generate a secure random token for password reset."""
    return secrets.token_urlsafe(32)


def is_reset_token_valid(user: "User", token: str) -> bool:
    """Check if the reset token is valid and not expired."""
    if not user.reset_token or not user.reset_token_expires_at:
        return False
    if user.reset_token != token:
        return False
    if datetime.now(timezone.utc) > user.reset_token_expires_at.replace(tzinfo=timezone.utc):
        return False
    return True
