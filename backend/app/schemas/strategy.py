from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

# MVP allowed values
ALLOWED_ASSETS = ["BTC/USDT", "ETH/USDT"]
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
