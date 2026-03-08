from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class TemplateResponse(BaseModel):
    id: UUID
    name: str
    description: str
    logic_summary: str
    use_cases: list[str]
    parameter_ranges: dict[str, str]
    asset: str
    timeframe: str
    difficulty: str
    sort_order: int
    teaches_description: Optional[str] = None
    created_at: datetime


class TemplateDetailResponse(TemplateResponse):
    definition_json: dict
