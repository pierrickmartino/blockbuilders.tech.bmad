from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, UniqueConstraint
from sqlmodel import Field, SQLModel, Column


class StrategyDraft(SQLModel, table=True):
    __tablename__ = "strategy_drafts"
    __table_args__ = (UniqueConstraint("strategy_id", name="uq_strategy_drafts_strategy_id"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    strategy_id: UUID = Field(foreign_key="strategies.id", index=True)
    definition_json: dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=datetime.utcnow)
