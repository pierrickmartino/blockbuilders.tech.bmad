"""Pydantic schemas for the coaching endpoint."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class CoachRequest(BaseModel):
    run_id_a: UUID
    run_id_b: UUID


class TradeCoachingItem(BaseModel):
    entry_time: datetime
    insight_type: str
    exit_reason_a: str
    pnl_a: float
    pnl_pct_a: float
    exit_reason_b: str
    pnl_b: float
    pnl_pct_b: float


class CoachResponse(BaseModel):
    eligible: bool
    reason: str
    tier: Optional[str] = None
    headline: Optional[str] = None
    net_delta_pct: Optional[float] = None
    insights: list[TradeCoachingItem] = []
