import re
from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

# MVP allowed values
ALLOWED_ASSETS = [
    # Major pairs (existing)
    "BTC/USDT",
    "ETH/USDT",
    # Large cap altcoins
    "ADA/USDT",
    "SOL/USDT",
    "MATIC/USDT",
    "LINK/USDT",
    "DOT/USDT",
    "XRP/USDT",
    "DOGE/USDT",
    "AVAX/USDT",
    "LTC/USDT",
    "BCH/USDT",
    "ATOM/USDT",
    "NEAR/USDT",
    "FIL/USDT",
    # Mid-cap altcoins
    "APT/USDT",
    "OP/USDT",
    "ARB/USDT",
    "INJ/USDT",
    "UNI/USDT",
    "AAVE/USDT",
    # Newer entrants
    "SUI/USDT",
    "SEI/USDT",
    "TIA/USDT",
]
ALLOWED_TIMEFRAMES = ["1d", "4h"]


class StrategyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    asset: str
    timeframe: str

    @field_validator("asset")
    @classmethod
    def validate_asset(cls, v: str) -> str:
        if v not in ALLOWED_ASSETS:
            raise ValueError(f"Asset must be one of: {', '.join(ALLOWED_ASSETS)}")
        return v

    @field_validator("timeframe")
    @classmethod
    def validate_timeframe(cls, v: str) -> str:
        if v not in ALLOWED_TIMEFRAMES:
            raise ValueError(f"Timeframe must be one of: {', '.join(ALLOWED_TIMEFRAMES)}")
        return v


class StrategyUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    asset: Optional[str] = None
    timeframe: Optional[str] = None
    is_archived: Optional[bool] = None
    auto_update_enabled: Optional[bool] = None
    auto_update_lookback_days: Optional[int] = Field(default=None, ge=30, le=730)
    tag_ids: Optional[list[UUID]] = Field(default=None, max_length=20)

    @field_validator("asset")
    @classmethod
    def validate_asset(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ALLOWED_ASSETS:
            raise ValueError(f"Asset must be one of: {', '.join(ALLOWED_ASSETS)}")
        return v

    @field_validator("timeframe")
    @classmethod
    def validate_timeframe(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ALLOWED_TIMEFRAMES:
            raise ValueError(f"Timeframe must be one of: {', '.join(ALLOWED_TIMEFRAMES)}")
        return v


class StrategyTagCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=24)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Tag name cannot be empty")
        if not re.match(r"^[a-zA-Z0-9 _-]+$", v):
            raise ValueError(
                "Tag name can only contain letters, numbers, spaces, dashes, and underscores"
            )
        return v


class StrategyTagResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime
    updated_at: datetime


class StrategyVersionCreateRequest(BaseModel):
    definition: dict[str, Any] = Field(default_factory=dict)


class StrategyResponse(BaseModel):
    id: UUID
    name: str
    asset: str
    timeframe: str
    is_archived: bool
    auto_update_enabled: bool
    auto_update_lookback_days: int
    last_auto_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    tags: list[StrategyTagResponse] = Field(default_factory=list)


class StrategyWithMetricsResponse(StrategyResponse):
    """Strategy response with latest backtest metrics."""
    latest_total_return_pct: Optional[float] = None
    latest_max_drawdown_pct: Optional[float] = None
    latest_win_rate_pct: Optional[float] = None
    latest_num_trades: Optional[int] = None
    last_run_at: Optional[datetime] = None


class StrategyVersionResponse(BaseModel):
    id: UUID
    version_number: int
    created_at: datetime


class StrategyVersionDetailResponse(BaseModel):
    id: UUID
    version_number: int
    definition_json: dict[str, Any]
    created_at: datetime


# Strategy validation schemas (Epic 3)
class BlockPosition(BaseModel):
    x: float
    y: float


class Block(BaseModel):
    id: str
    type: str
    label: str
    position: BlockPosition
    params: dict[str, Any] = Field(default_factory=dict)


class ConnectionPort(BaseModel):
    block_id: str
    port: str


class Connection(BaseModel):
    from_port: ConnectionPort = Field(alias="from")
    to_port: ConnectionPort = Field(alias="to")

    model_config = {"populate_by_name": True}


class StrategyDefinitionValidate(BaseModel):
    blocks: list[Block]
    connections: list[Connection]
    meta: dict[str, Any] = Field(default_factory=dict)


class ValidationError(BaseModel):
    block_id: Optional[str] = None
    code: str
    message: str


class ValidationResponse(BaseModel):
    status: Literal["valid", "invalid"]
    errors: list[ValidationError]


# Bulk operation schemas
class BulkStrategyRequest(BaseModel):
    strategy_ids: list[UUID] = Field(min_length=1, max_length=100)


class BulkStrategyTagRequest(BaseModel):
    strategy_ids: list[UUID] = Field(min_length=1, max_length=100)
    tag_ids: list[UUID] = Field(min_length=1, max_length=20)


class BulkStrategyResponse(BaseModel):
    success_count: int
    failed_count: int
    failed_ids: list[UUID] = Field(default_factory=list)
    error_message: str | None = None
