from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class RecordVerdictViewedRequest(BaseModel):
    strategy_id: UUID


class RecordVerdictViewedResponse(BaseModel):
    lesson_id: Optional[str] = None
    completed_at: Optional[datetime] = None
