from datetime import datetime
from enum import Enum
from typing import Optional, List
from uuid import UUID, uuid4
from sqlalchemy import Column, String, JSON
from sqlmodel import SQLModel, Field


class TimezonePreference(str, Enum):
    LOCAL = "local"
    UTC = "utc"


class ThemePreference(str, Enum):
    SYSTEM = "system"
    LIGHT = "light"
    DARK = "dark"


class PlanTier(str, Enum):
    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"


class PlanInterval(str, Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    TRIALING = "trialing"


class UserTier(str, Enum):
    STANDARD = "standard"
    BETA = "beta"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: Optional[str] = None  # Nullable for OAuth users
    default_fee_percent: Optional[float] = None
    default_slippage_percent: Optional[float] = None
    max_strategies: int = Field(default=10)
    max_backtests_per_day: int = Field(default=50)
    backtest_credit_balance: int = Field(default=0)
    extra_strategy_slots: int = Field(default=0)
    timezone_preference: TimezonePreference = Field(
        default=TimezonePreference.LOCAL,
        sa_column=Column(String(10), nullable=False),
    )
    theme_preference: ThemePreference = Field(
        default=ThemePreference.SYSTEM,
        sa_column=Column(String(10), nullable=False),
    )
    favorite_metrics: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Subscription & billing
    plan_tier: PlanTier = Field(
        default=PlanTier.FREE,
        sa_column=Column(String(20), nullable=False),
    )
    plan_interval: Optional[PlanInterval] = Field(
        default=None,
        sa_column=Column(String(20), nullable=True),
    )
    stripe_customer_id: Optional[str] = Field(default=None, max_length=255, unique=True)
    stripe_subscription_id: Optional[str] = Field(default=None, max_length=255, unique=True)
    subscription_status: Optional[SubscriptionStatus] = Field(
        default=None,
        sa_column=Column(String(20), nullable=True),
    )
    user_tier: UserTier = Field(
        default=UserTier.STANDARD,
        sa_column=Column(String(10), nullable=False),
    )

    # Password reset
    reset_token: Optional[str] = None
    reset_token_expires_at: Optional[datetime] = None

    # OAuth
    auth_provider: Optional[str] = None  # "google", "github", or None for email/password
    provider_user_id: Optional[str] = None
