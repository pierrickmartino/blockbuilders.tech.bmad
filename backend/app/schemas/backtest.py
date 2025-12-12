"""Pydantic schemas for backtest endpoints."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, field_validator


class BacktestCreateRequest(BaseModel):
    """Request body for creating a backtest run."""

    strategy_id: UUID
    date_from: datetime
    date_to: datetime
    fee_rate: Optional[float] = None
    slippage_rate: Optional[float] = None

    @field_validator("date_to")
    @classmethod
    def date_to_after_date_from(cls, v: datetime, info) -> datetime:
        date_from = info.data.get("date_from")
        if date_from and v <= date_from:
            raise ValueError("date_to must be after date_from")
        return v

    @field_validator("fee_rate")
    @classmethod
    def validate_fee_rate(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < 0 or v > 0.1):
            raise ValueError("fee_rate must be between 0 and 0.1 (10%)")
        return v

    @field_validator("slippage_rate")
    @classmethod
    def validate_slippage_rate(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < 0 or v > 0.1):
            raise ValueError("slippage_rate must be between 0 and 0.1 (10%)")
        return v


class BacktestCreateResponse(BaseModel):
    """Response after creating a backtest run."""

    run_id: UUID
    status: str


class BacktestSummary(BaseModel):
    """Summary metrics from a completed backtest."""

    initial_balance: float
    final_balance: float
    total_return_pct: float
    cagr_pct: float
    max_drawdown_pct: float
    num_trades: int
    win_rate_pct: float


class BacktestStatusResponse(BaseModel):
    """Response for backtest status endpoint."""

    run_id: UUID
    strategy_id: UUID
    status: str
    asset: str
    timeframe: str
    date_from: datetime
    date_to: datetime
    summary: Optional[BacktestSummary] = None
    error_message: Optional[str] = None


class BacktestListItem(BaseModel):
    """Item in the backtest list response."""

    run_id: UUID
    strategy_id: UUID
    status: str
    asset: str
    timeframe: str
    date_from: datetime
    date_to: datetime
    total_return: Optional[float] = None
    created_at: datetime
