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
    benchmark_return_pct: float
    alpha: float
    beta: float
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    max_consecutive_losses: int


class DataQualityMetrics(BaseModel):
    """Response model for data quality metrics."""

    asset: str
    timeframe: str
    date_from: datetime
    date_to: datetime
    gap_percent: float
    outlier_count: int
    volume_consistency: float
    has_issues: bool
    issues_description: str


class BacktestStatusResponse(BaseModel):
    """Response for backtest status endpoint."""

    run_id: UUID
    strategy_id: UUID
    status: str
    asset: str
    timeframe: str
    date_from: datetime
    date_to: datetime
    triggered_by: str = "manual"
    summary: Optional[BacktestSummary] = None
    error_message: Optional[str] = None
    data_quality: Optional[DataQualityMetrics] = None


class BacktestListItem(BaseModel):
    """Item in the backtest list response."""

    run_id: UUID
    strategy_id: UUID
    status: str
    asset: str
    timeframe: str
    date_from: datetime
    date_to: datetime
    triggered_by: str = "manual"
    total_return: Optional[float] = None
    created_at: datetime


class Trade(BaseModel):
    """Single trade from a backtest run."""

    entry_time: datetime
    entry_price: float
    exit_time: datetime
    exit_price: float
    side: str
    pnl: float
    pnl_pct: float


class EquityCurvePoint(BaseModel):
    """Single point on the equity curve."""

    timestamp: datetime
    equity: float


class TradeDetail(BaseModel):
    """Extended trade details for drawer view."""

    entry_time: datetime
    entry_price: float
    exit_time: datetime
    exit_price: float
    side: str
    pnl: float
    pnl_pct: float
    qty: float
    sl_price_at_entry: Optional[float] = None
    tp_price_at_entry: Optional[float] = None
    exit_reason: str
    mae_usd: float
    mae_pct: float
    mfe_usd: float
    mfe_pct: float
    initial_risk_usd: Optional[float] = None
    r_multiple: Optional[float] = None
    peak_price: float
    peak_ts: datetime
    trough_price: float
    trough_ts: datetime
    duration_seconds: int


class CandleResponse(BaseModel):
    """Single candle for chart."""

    timestamp: datetime
    open: float
    high: float
    low: float
    close: float


class TradeDetailResponse(BaseModel):
    """Response for single trade detail endpoint."""

    trade: TradeDetail
    candles: list[CandleResponse]
    asset: str
    timeframe: str


class GapRange(BaseModel):
    """Single gap range with start and end timestamps."""

    start: datetime
    end: datetime


class DataCompletenessResponse(BaseModel):
    """Response model for data completeness metrics."""

    asset: str
    timeframe: str
    coverage_start: Optional[datetime] = None
    coverage_end: Optional[datetime] = None
    completeness_percent: float
    gap_count: int
    gap_total_hours: float
    gap_ranges: list[GapRange]


class ShareLinkCreateRequest(BaseModel):
    """Request to create a shareable backtest link."""

    expires_at: Optional[datetime] = None


class ShareLinkCreateResponse(BaseModel):
    """Response after creating a shareable backtest link."""

    url: str
    token: str
    expires_at: Optional[datetime] = None


class PublicBacktestView(BaseModel):
    """Public view of backtest results (no strategy logic)."""

    asset: str
    timeframe: str
    date_from: datetime
    date_to: datetime
    summary: BacktestSummary
    equity_curve: list[EquityCurvePoint]


class BacktestCompareRequest(BaseModel):
    """Request to compare multiple backtest runs."""

    run_ids: list[UUID]


class BacktestCompareRun(BaseModel):
    """Single run data in comparison response."""

    run_id: UUID
    asset: str
    timeframe: str
    date_from: datetime
    date_to: datetime
    created_at: datetime
    summary: Optional[BacktestSummary] = None
    equity_curve: list[EquityCurvePoint]


class BacktestCompareResponse(BaseModel):
    """Response for comparison endpoint."""

    runs: list[BacktestCompareRun]
