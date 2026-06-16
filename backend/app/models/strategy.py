from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlmodel import Column, Field, SQLModel


class StrategyEntryPath(str, Enum):
    """How a strategy came to exist — the launch-surface cohort dimension
    (CONTEXT.md → Entry path; ADR-0009). Stamped once at creation; never
    backfilled for pre-existing rows (they read `null`)."""

    WIZARD = "wizard"
    BLANK_CANVAS = "blank_canvas"
    TEMPLATE_CLONE = "template_clone"
    NL_WEDGE = "nl_wedge"


class Strategy(SQLModel, table=True):
    __tablename__ = "strategies"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    name: str
    asset: str  # e.g. "BTC/USDT"
    timeframe: str  # e.g. "1h", "4h"
    entry_path: Optional[StrategyEntryPath] = Field(
        default=None,
        sa_column=Column(
            SAEnum(StrategyEntryPath, name="strategy_entry_path_enum", values_callable=lambda e: [m.value for m in e]),
            nullable=True,
        ),
    )
    source_template_id: Optional[UUID] = Field(default=None, foreign_key="strategy_templates.id")
    is_archived: bool = Field(default=False)
    is_published: bool = Field(default=False)
    auto_update_enabled: bool = Field(default=False)
    auto_update_lookback_days: int = Field(default=365)
    last_auto_run_at: Optional[datetime] = Field(default=None)
    digest_email_enabled: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
