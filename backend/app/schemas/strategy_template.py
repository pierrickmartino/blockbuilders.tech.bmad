from datetime import datetime
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
    created_at: datetime


class TemplateDetailResponse(TemplateResponse):
    definition_json: dict
