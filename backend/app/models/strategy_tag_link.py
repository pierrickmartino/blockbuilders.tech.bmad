from datetime import datetime, timezone
from uuid import UUID

from sqlmodel import Field, SQLModel


class StrategyTagLink(SQLModel, table=True):
    __tablename__ = "strategy_tag_links"

    strategy_id: UUID = Field(foreign_key="strategies.id", primary_key=True)
    tag_id: UUID = Field(foreign_key="strategy_tags.id", primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
