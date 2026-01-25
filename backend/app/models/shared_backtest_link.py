"""Shared backtest link model for public result sharing."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class SharedBacktestLink(SQLModel, table=True):
    """Token-based shareable link for backtest results."""

    __tablename__ = "shared_backtest_links"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    backtest_run_id: UUID = Field(foreign_key="backtest_runs.id", index=True)
    token: str = Field(index=True, unique=True, max_length=64)
    expires_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
