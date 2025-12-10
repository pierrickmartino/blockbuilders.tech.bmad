from datetime import datetime
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
    auto_update_enabled: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
