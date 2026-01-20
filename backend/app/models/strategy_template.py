from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON


class StrategyTemplate(SQLModel, table=True):
    __tablename__ = "strategy_templates"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=100)
    description: str = Field(max_length=500)
    logic_summary: str = Field(max_length=500)
    use_cases: dict = Field(sa_column=Column(JSON))
    parameter_ranges: dict = Field(sa_column=Column(JSON))
    definition_json: dict = Field(sa_column=Column(JSON))
    source: str = Field(default="blockbuilders")
    status: str = Field(default="published")
    asset: str
    timeframe: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
