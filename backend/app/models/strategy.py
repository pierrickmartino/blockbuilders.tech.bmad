from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field


class Strategy(SQLModel, table=True):
    __tablename__ = "strategies"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    name: str
    asset: str  # e.g. "BTC/USDT"
    timeframe: str  # e.g. "1h", "4h"
    is_archived: bool = Field(default=False)
    is_published: bool = Field(default=False)
    auto_update_enabled: bool = Field(default=False)
    auto_update_lookback_days: int = Field(default=365)
    last_auto_run_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
