from datetime import datetime
from typing import Any, Optional
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
