import logging
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import resend
from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import get_session
from app.core.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    is_reset_token_valid,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    MessageResponse,
    OAuthCallbackRequest,
    OAuthStartResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    SignupRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


def _get_redis() -> Redis:
    """Get Redis connection for OAuth state storage."""
    return Redis.from_url(settings.redis_url)


def _build_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        default_fee_percent=user.default_fee_percent,
        default_slippage_percent=user.default_slippage_percent,
        timezone_preference=user.timezone_preference,
    )


@router.post("/signup", response_model=AuthResponse)
def signup(data: SignupRequest, session: Session = Depends(get_session)) -> AuthResponse:
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    token = create_access_token(str(user.id))
    return AuthResponse(token=token, user=_build_user_response(user))


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, session: Session = Depends(get_session)) -> AuthResponse:
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(str(user.id))
    return AuthResponse(token=token, user=_build_user_response(user))


# --- Password Reset ---


@router.post("/password-reset-request", response_model=MessageResponse)
def request_password_reset(
    data: PasswordResetRequest, session: Session = Depends(get_session)
) -> MessageResponse:
    # TODO: Add rate limiting (e.g., max 3 requests per email per hour)
    # to prevent email bombing and credential stuffing attacks
    user = session.exec(select(User).where(User.email == data.email)).first()
    if user and user.password_hash:  # Only for email/password users
        token = generate_reset_token()
        user.reset_token = token
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.reset_token_expire_hours
        )
        session.add(user)
        session.commit()

        # Send email via Resend
        if settings.resend_api_key:
            resend.api_key = settings.resend_api_key
            reset_url = f"{settings.frontend_url}/reset-password?token={token}"
            try:
                resend.Emails.send(
                    {
                        "from": "Blockbuilders <noreply@blockbuilders.tech>",
                        "to": [user.email],
                        "subject": "Reset your password",
                        "html": f"""
                            <p>You requested a password reset for your Blockbuilders account.</p>
                            <p><a href="{reset_url}">Click here to reset your password</a></p>
                            <p>This link expires in {settings.reset_token_expire_hours} hour(s).</p>
                            <p>If you didn't request this, you can ignore this email.</p>
                        """,
                    }
                )
            except Exception as e:
                # Log error but don't reveal to user (prevents email enumeration)
                logger.error(f"Failed to send password reset email to {user.email}: {e}")

    # Always return success (don't reveal if email exists)
    return MessageResponse(
        message="If an account exists for this email, we've sent reset instructions."
    )


@router.post("/password-reset-confirm", response_model=MessageResponse)
def confirm_password_reset(
    data: PasswordResetConfirm, session: Session = Depends(get_session)
) -> MessageResponse:
    user = session.exec(select(User).where(User.reset_token == data.token)).first()
    if not user or not is_reset_token_valid(user, data.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    user.password_hash = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    session.add(user)
    session.commit()
    return MessageResponse(message="Password updated successfully")


# --- OAuth ---


@router.get("/oauth/{provider}/start", response_model=OAuthStartResponse)
def oauth_start(provider: str) -> OAuthStartResponse:
    if provider not in ("google", "github"):
        raise HTTPException(status_code=400, detail="Invalid provider")

    state = secrets.token_urlsafe(16)

    # Store state in Redis with 10-minute TTL
    redis = _get_redis()
    redis.setex(f"oauth_state:{state}", 600, provider)

    redirect_uri = f"{settings.frontend_url}/auth/callback"

    if provider == "google":
        if not settings.google_client_id:
            raise HTTPException(status_code=500, detail="Google OAuth not configured")
        params = {
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri,
            "scope": "email profile",
            "response_type": "code",
            "state": state,
        }
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    else:  # github
        if not settings.github_client_id:
            raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
        params = {
            "client_id": settings.github_client_id,
            "redirect_uri": redirect_uri,
            "scope": "user:email",
            "state": state,
        }
        auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"

    return OAuthStartResponse(auth_url=auth_url)


@router.post("/oauth/{provider}/callback", response_model=AuthResponse)
async def oauth_callback(
    provider: str, data: OAuthCallbackRequest, session: Session = Depends(get_session)
) -> AuthResponse:
    # Validate state from Redis
    redis = _get_redis()
    stored_provider = redis.get(f"oauth_state:{data.state}")
    if not stored_provider or stored_provider.decode() != provider:
        raise HTTPException(status_code=400, detail="Invalid state")
    redis.delete(f"oauth_state:{data.state}")

    redirect_uri = f"{settings.frontend_url}/auth/callback"

    # Exchange code for access token and get user info
    async with httpx.AsyncClient() as client:
        if provider == "google":
            # Exchange code for token
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "code": data.code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
            )
            if token_resp.status_code != 200:
                logger.error(
                    f"Google OAuth token exchange failed: {token_resp.status_code} - {token_resp.text}"
                )
                raise HTTPException(status_code=400, detail="Failed to exchange code")
            token_data = token_resp.json()
            access_token = token_data["access_token"]

            # Get user info
            user_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if user_resp.status_code != 200:
                logger.error(
                    f"Google OAuth user info failed: {user_resp.status_code} - {user_resp.text}"
                )
                raise HTTPException(status_code=400, detail="Failed to get user info")
            user_info = user_resp.json()
            provider_user_id = user_info["id"]
            email = user_info["email"]

        else:  # github
            # Exchange code for token
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": data.code,
                },
            )
            if token_resp.status_code != 200:
                logger.error(
                    f"GitHub OAuth token exchange failed: {token_resp.status_code} - {token_resp.text}"
                )
                raise HTTPException(status_code=400, detail="Failed to exchange code")
            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise HTTPException(status_code=400, detail="No access token received")

            # Get user info
            user_resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if user_resp.status_code != 200:
                logger.error(
                    f"GitHub OAuth user info failed: {user_resp.status_code} - {user_resp.text}"
                )
                raise HTTPException(status_code=400, detail="Failed to get user info")
            user_info = user_resp.json()
            provider_user_id = str(user_info["id"])

            # Get email (may be private)
            email = user_info.get("email")
            if not email:
                emails_resp = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if emails_resp.status_code == 200:
                    emails = emails_resp.json()
                    primary = next((e for e in emails if e.get("primary")), None)
                    email = primary["email"] if primary else emails[0]["email"]
            if not email:
                raise HTTPException(status_code=400, detail="Could not get email from GitHub")

    # Find or create user
    user = session.exec(
        select(User).where(
            User.auth_provider == provider, User.provider_user_id == provider_user_id
        )
    ).first()

    if not user:
        # Check if email already exists
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            # Security: Don't auto-link OAuth to existing accounts
            # This prevents account takeover via OAuth
            raise HTTPException(
                status_code=400,
                detail="An account with this email already exists. Please sign in with email/password.",
            )
        # Create new user
        user = User(
            email=email,
            auth_provider=provider,
            provider_user_id=provider_user_id,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    token = create_access_token(str(user.id))
    return AuthResponse(token=token, user=_build_user_response(user))
