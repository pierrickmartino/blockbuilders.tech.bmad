from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.user import TimezonePreference


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=72)


class UserResponse(BaseModel):
    id: UUID
    email: str
    default_fee_percent: Optional[float] = None
    default_slippage_percent: Optional[float] = None
    timezone_preference: TimezonePreference = TimezonePreference.LOCAL


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class UserUpdateRequest(BaseModel):
    default_fee_percent: Optional[float] = Field(default=None, ge=0, le=5)
    default_slippage_percent: Optional[float] = Field(default=None, ge=0, le=5)
    timezone_preference: Optional[TimezonePreference] = None


# Profile page bundled response types
class UsageItem(BaseModel):
    used: int
    limit: int


class BacktestUsageItem(UsageItem):
    resets_at_utc: str


class SettingsResponse(BaseModel):
    default_fee_percent: Optional[float] = None
    default_slippage_percent: Optional[float] = None
    timezone_preference: TimezonePreference = TimezonePreference.LOCAL
    backtest_credit_balance: int = 0
    extra_strategy_slots: int = 0


class UsageBundle(BaseModel):
    strategies: UsageItem
    backtests_today: BacktestUsageItem


class PlanResponse(BaseModel):
    tier: str
    interval: Optional[str] = None
    status: Optional[str] = None
    max_strategies: int
    max_backtests_per_day: int
    max_history_days: int


class ProfileResponse(BaseModel):
    id: UUID
    email: str
    settings: SettingsResponse
    usage: UsageBundle
    plan: PlanResponse


# Password reset
class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


class MessageResponse(BaseModel):
    message: str


# OAuth
class OAuthStartResponse(BaseModel):
    auth_url: str


class OAuthCallbackRequest(BaseModel):
    code: str
    state: str
