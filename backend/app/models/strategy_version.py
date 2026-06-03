from datetime import datetime
from typing import Any
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON


class StrategyVersion(SQLModel, table=True):
    __tablename__ = "strategy_versions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    strategy_id: UUID = Field(foreign_key="strategies.id", index=True)
    version_number: int
    definition_json: dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
