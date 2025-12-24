from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4
from sqlalchemy import Column, String
from sqlmodel import SQLModel, Field


class TimezonePreference(str, Enum):
    LOCAL = "local"
    UTC = "utc"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: Optional[str] = None  # Nullable for OAuth users
    default_fee_percent: Optional[float] = None
    default_slippage_percent: Optional[float] = None
    max_strategies: int = Field(default=10)
    max_backtests_per_day: int = Field(default=50)
    timezone_preference: TimezonePreference = Field(
        default=TimezonePreference.LOCAL,
        sa_column=Column(String(10), nullable=False),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Password reset
    reset_token: Optional[str] = None
    reset_token_expires_at: Optional[datetime] = None

    # OAuth
    auth_provider: Optional[str] = None  # "google", "github", or None for email/password
    provider_user_id: Optional[str] = None
