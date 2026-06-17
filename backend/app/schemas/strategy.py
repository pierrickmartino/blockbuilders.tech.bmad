import re
from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.strategy import StrategyEntryPath

# Entry paths a creation request may self-report (CONTEXT.md → Entry path;
# ADR-0009). `template_clone` is excluded: it is stamped exclusively by the
# dedicated clone route, which needs no client input to know its own
# provenance — a client must not be able to claim it through this endpoint.
CLIENT_STAMPABLE_ENTRY_PATHS = {
    StrategyEntryPath.WIZARD,
    StrategyEntryPath.BLANK_CANVAS,
    StrategyEntryPath.NL_WEDGE,
}

# Supported trading pairs (~50 tokens)
ALLOWED_ASSETS = [
    # Major pairs
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
    "BNB/USDT",
    "TRX/USDT",
    "TON/USDT",
    "HBAR/USDT",
    "VET/USDT",
    "ALGO/USDT",
    "XLM/USDT",
    "EOS/USDT",
    "ICP/USDT",
    "SHIB/USDT",
    "PEPE/USDT",
    # Mid-cap altcoins
    "APT/USDT",
    "OP/USDT",
    "ARB/USDT",
    "INJ/USDT",
    "UNI/USDT",
    "AAVE/USDT",
    "SUI/USDT",
    "SEI/USDT",
    "TIA/USDT",
    "FTM/USDT",
    "CRV/USDT",
    "GRT/USDT",
    "MKR/USDT",
    "SNX/USDT",
    "RENDER/USDT",
    "FET/USDT",
    "STX/USDT",
    "IMX/USDT",
    "PENDLE/USDT",
    "THETA/USDT",
    "TAO/USDT",
    "WLD/USDT",
    "JUP/USDT",
    "SAND/USDT",
    "MANA/USDT",
]
ALLOWED_TIMEFRAMES = ["1d", "4h", "1h"]


class StrategyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    asset: str
    timeframe: str
    entry_path: Optional[StrategyEntryPath] = None

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

    @field_validator("entry_path")
    @classmethod
    def validate_entry_path(cls, v: Optional[StrategyEntryPath]) -> Optional[StrategyEntryPath]:
        if v is not None and v not in CLIENT_STAMPABLE_ENTRY_PATHS:
            allowed = ", ".join(p.value for p in CLIENT_STAMPABLE_ENTRY_PATHS)
            raise ValueError(f"entry_path must be one of: {allowed}")
        return v


class StrategyDraftFromNlRequest(BaseModel):
    """Request body for POST /strategies/draft-from-nl (ADR-0011, ADR-0006).

    `asset`/`timeframe` come from explicit UI controls and are authoritative;
    the drafter must ignore anything resembling them in `nl_text`.
    """

    nl_text: str = Field(min_length=1, max_length=2000)
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


class StrategyDraftFromNlResponse(BaseModel):
    """Response body for POST /strategies/draft-from-nl.

    `success`: a new Strategy was created; `strategy_id` is set, `reason` is None.
    `declined`: the drafter (or validator) could not produce a usable graph;
    `reason` explains why, `strategy_id` is None. Nothing partial is persisted.
    `disabled`: the `strategy_drafter_enabled` flag is off.
    """

    outcome: Literal["success", "declined", "disabled"]
    strategy_id: Optional[UUID] = None
    reason: Optional[str] = None


class StrategyUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    asset: Optional[str] = None
    timeframe: Optional[str] = None
    is_archived: Optional[bool] = None
    auto_update_enabled: Optional[bool] = None
    auto_update_lookback_days: Optional[int] = Field(default=None, ge=30, le=730)
    tag_ids: Optional[list[UUID]] = Field(default=None, max_length=20)
    digest_email_enabled: Optional[bool] = None

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


class StrategyDraftUpsertRequest(BaseModel):
    definition_json: dict[str, Any] = Field(default_factory=dict)


class StrategyDraftResponse(BaseModel):
    strategy_id: UUID
    definition_json: dict[str, Any]
    updated_at: datetime


class StrategyResponse(BaseModel):
    id: UUID
    name: str
    asset: str
    timeframe: str
    entry_path: Optional[StrategyEntryPath] = None
    source_template_id: Optional[UUID] = None
    is_archived: bool
    auto_update_enabled: bool
    auto_update_lookback_days: int
    last_auto_run_at: Optional[datetime] = None
    digest_email_enabled: bool = True
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
    # Period returns (from latest completed backtest matching each period duration)
    return_30d: Optional[float] = None
    return_60d: Optional[float] = None
    return_90d: Optional[float] = None
    return_1y: Optional[float] = None
    return_2y: Optional[float] = None
    return_3y: Optional[float] = None


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
    user_message: Optional[str] = None
    help_link: Optional[str] = None


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


class StrategyDeleteResponse(BaseModel):
    id: UUID
    deleted: bool = True
