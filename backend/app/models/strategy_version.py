from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from sqlalchemy import Enum as SAEnum


class VersionStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class StrategyVersion(SQLModel, table=True):
    __tablename__ = "strategy_versions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    strategy_id: UUID = Field(foreign_key="strategies.id", index=True)
    version_number: int
    definition_json: dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: VersionStatus = Field(
        default=VersionStatus.DRAFT,
        sa_column=Column(
            SAEnum(
                VersionStatus,
                values_callable=lambda e: [m.value for m in e],
                create_type=False,
            ),
            nullable=False,
            server_default=VersionStatus.DRAFT.value,
        ),
    )
