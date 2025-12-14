from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.schemas.strategy import (
    Block,
    StrategyCreateRequest,
    StrategyDefinitionValidate,
    StrategyResponse,
    StrategyUpdateRequest,
    StrategyVersionCreateRequest,
    StrategyVersionDetailResponse,
    StrategyVersionResponse,
    ValidationError,
    ValidationResponse,
)

router = APIRouter(prefix="/strategies", tags=["strategies"])


def get_user_strategy(
    strategy_id: UUID, user: User, session: Session
) -> Strategy:
    """Get a strategy owned by the current user, or raise 404."""
    strategy = session.exec(
        select(Strategy).where(Strategy.id == strategy_id, Strategy.user_id == user.id)
    ).first()
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
    return strategy


@router.post("/", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
def create_strategy(
    data: StrategyCreateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyResponse:
    """Create a new strategy."""
    strategy = Strategy(
        user_id=user.id,
        name=data.name,
        asset=data.asset,
        timeframe=data.timeframe,
    )
    session.add(strategy)
    session.commit()
    session.refresh(strategy)
    return StrategyResponse(
        id=strategy.id,
        name=strategy.name,
        asset=strategy.asset,
        timeframe=strategy.timeframe,
        is_archived=strategy.is_archived,
        auto_update_enabled=strategy.auto_update_enabled,
        auto_update_lookback_days=strategy.auto_update_lookback_days,
        last_auto_run_at=strategy.last_auto_run_at,
        created_at=strategy.created_at,
        updated_at=strategy.updated_at,
    )


@router.get("/", response_model=list[StrategyResponse])
def list_strategies(
    search: str = Query(default="", description="Filter by name (case-insensitive)"),
    include_archived: bool = Query(default=False, description="Include archived strategies"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[StrategyResponse]:
    """List all strategies for the current user."""
    query = select(Strategy).where(Strategy.user_id == user.id)

    if not include_archived:
        query = query.where(Strategy.is_archived == False)  # noqa: E712

    if search:
        query = query.where(Strategy.name.ilike(f"%{search}%"))

    query = query.order_by(Strategy.updated_at.desc())
    strategies = session.exec(query).all()

    return [
        StrategyResponse(
            id=s.id,
            name=s.name,
            asset=s.asset,
            timeframe=s.timeframe,
            is_archived=s.is_archived,
            auto_update_enabled=s.auto_update_enabled,
            auto_update_lookback_days=s.auto_update_lookback_days,
            last_auto_run_at=s.last_auto_run_at,
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in strategies
    ]


@router.get("/{strategy_id}", response_model=StrategyResponse)
def get_strategy(
    strategy_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyResponse:
    """Get a single strategy by ID."""
    strategy = get_user_strategy(strategy_id, user, session)
    return StrategyResponse(
        id=strategy.id,
        name=strategy.name,
        asset=strategy.asset,
        timeframe=strategy.timeframe,
        is_archived=strategy.is_archived,
        auto_update_enabled=strategy.auto_update_enabled,
        auto_update_lookback_days=strategy.auto_update_lookback_days,
        last_auto_run_at=strategy.last_auto_run_at,
        created_at=strategy.created_at,
        updated_at=strategy.updated_at,
    )


@router.patch("/{strategy_id}", response_model=StrategyResponse)
def update_strategy(
    strategy_id: UUID,
    data: StrategyUpdateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyResponse:
    """Update a strategy's metadata."""
    strategy = get_user_strategy(strategy_id, user, session)

    if data.name is not None:
        strategy.name = data.name
    if data.asset is not None:
        strategy.asset = data.asset
    if data.timeframe is not None:
        strategy.timeframe = data.timeframe
    if data.is_archived is not None:
        strategy.is_archived = data.is_archived
    if data.auto_update_enabled is not None:
        strategy.auto_update_enabled = data.auto_update_enabled
    if data.auto_update_lookback_days is not None:
        strategy.auto_update_lookback_days = data.auto_update_lookback_days

    strategy.updated_at = datetime.now(timezone.utc)
    session.add(strategy)
    session.commit()
    session.refresh(strategy)

    return StrategyResponse(
        id=strategy.id,
        name=strategy.name,
        asset=strategy.asset,
        timeframe=strategy.timeframe,
        is_archived=strategy.is_archived,
        auto_update_enabled=strategy.auto_update_enabled,
        auto_update_lookback_days=strategy.auto_update_lookback_days,
        last_auto_run_at=strategy.last_auto_run_at,
        created_at=strategy.created_at,
        updated_at=strategy.updated_at,
    )


@router.post("/{strategy_id}/duplicate", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
def duplicate_strategy(
    strategy_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyResponse:
    """Duplicate a strategy with its latest version."""
    original = get_user_strategy(strategy_id, user, session)

    # Create new strategy with "(copy)" suffix
    new_strategy = Strategy(
        user_id=user.id,
        name=f"{original.name} (copy)",
        asset=original.asset,
        timeframe=original.timeframe,
    )
    session.add(new_strategy)
    session.commit()
    session.refresh(new_strategy)

    # Copy latest version if exists
    latest_version = session.exec(
        select(StrategyVersion)
        .where(StrategyVersion.strategy_id == original.id)
        .order_by(StrategyVersion.version_number.desc())
    ).first()

    if latest_version:
        new_version = StrategyVersion(
            strategy_id=new_strategy.id,
            version_number=1,
            definition_json=latest_version.definition_json,
        )
        session.add(new_version)
        session.commit()

    return StrategyResponse(
        id=new_strategy.id,
        name=new_strategy.name,
        asset=new_strategy.asset,
        timeframe=new_strategy.timeframe,
        is_archived=new_strategy.is_archived,
        auto_update_enabled=new_strategy.auto_update_enabled,
        auto_update_lookback_days=new_strategy.auto_update_lookback_days,
        last_auto_run_at=new_strategy.last_auto_run_at,
        created_at=new_strategy.created_at,
        updated_at=new_strategy.updated_at,
    )


@router.post("/{strategy_id}/versions", response_model=StrategyVersionResponse, status_code=status.HTTP_201_CREATED)
def create_version(
    strategy_id: UUID,
    data: StrategyVersionCreateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyVersionResponse:
    """Create a new version of a strategy."""
    strategy = get_user_strategy(strategy_id, user, session)

    # Get max version number
    max_version = session.exec(
        select(func.max(StrategyVersion.version_number)).where(
            StrategyVersion.strategy_id == strategy.id
        )
    ).one()
    new_version_number = (max_version or 0) + 1

    version = StrategyVersion(
        strategy_id=strategy.id,
        version_number=new_version_number,
        definition_json=data.definition,
    )
    session.add(version)

    # Update strategy's updated_at
    strategy.updated_at = datetime.now(timezone.utc)
    session.add(strategy)

    session.commit()
    session.refresh(version)

    return StrategyVersionResponse(
        id=version.id,
        version_number=version.version_number,
        created_at=version.created_at,
    )


@router.get("/{strategy_id}/versions", response_model=list[StrategyVersionResponse])
def list_versions(
    strategy_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[StrategyVersionResponse]:
    """List all versions of a strategy."""
    strategy = get_user_strategy(strategy_id, user, session)

    versions = session.exec(
        select(StrategyVersion)
        .where(StrategyVersion.strategy_id == strategy.id)
        .order_by(StrategyVersion.version_number.desc())
    ).all()

    return [
        StrategyVersionResponse(
            id=v.id,
            version_number=v.version_number,
            created_at=v.created_at,
        )
        for v in versions
    ]


@router.get("/{strategy_id}/versions/{version_number}", response_model=StrategyVersionDetailResponse)
def get_version(
    strategy_id: UUID,
    version_number: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyVersionDetailResponse:
    """Get a specific version of a strategy with its definition."""
    strategy = get_user_strategy(strategy_id, user, session)

    version = session.exec(
        select(StrategyVersion).where(
            StrategyVersion.strategy_id == strategy.id,
            StrategyVersion.version_number == version_number,
        )
    ).first()

    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    return StrategyVersionDetailResponse(
        id=version.id,
        version_number=version.version_number,
        definition_json=version.definition_json,
        created_at=version.created_at,
    )


def _validate_block_params(block: Block) -> list[ValidationError]:
    """Validate block parameters are within allowed ranges."""
    errors: list[ValidationError] = []
    params = block.params

    # Period validations for indicators
    if block.type in ("sma", "ema", "bollinger", "atr"):
        period = params.get("period", 0)
        if not isinstance(period, (int, float)) or not 1 <= period <= 500:
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERIOD",
                    message=f"Period must be 1-500, got {period}",
                )
            )

    if block.type == "rsi":
        period = params.get("period", 0)
        if not isinstance(period, (int, float)) or not 2 <= period <= 100:
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERIOD",
                    message=f"RSI period must be 2-100, got {period}",
                )
            )

    if block.type == "macd":
        fast = params.get("fast_period", 0)
        slow = params.get("slow_period", 0)
        signal = params.get("signal_period", 0)
        if not isinstance(fast, (int, float)) or not 1 <= fast <= 50:
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PARAM",
                    message=f"MACD fast period must be 1-50, got {fast}",
                )
            )
        if not isinstance(slow, (int, float)) or not 1 <= slow <= 200:
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PARAM",
                    message=f"MACD slow period must be 1-200, got {slow}",
                )
            )
        if not isinstance(signal, (int, float)) or not 1 <= signal <= 50:
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PARAM",
                    message=f"MACD signal period must be 1-50, got {signal}",
                )
            )

    # Risk block validations
    if block.type == "position_size":
        value = params.get("value", 0)
        if not isinstance(value, (int, float)) or not 1 <= value <= 100:
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERCENT",
                    message=f"Position size must be 1-100%, got {value}",
                )
            )

    if block.type == "take_profit":
        pct = params.get("take_profit_pct", 0)
        if not isinstance(pct, (int, float)) or not 0.1 <= pct <= 100:
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERCENT",
                    message=f"Take profit must be 0.1-100%, got {pct}",
                )
            )

    if block.type == "stop_loss":
        pct = params.get("stop_loss_pct", 0)
        if not isinstance(pct, (int, float)) or not 0.1 <= pct <= 100:
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERCENT",
                    message=f"Stop loss must be 0.1-100%, got {pct}",
                )
            )

    return errors


@router.post("/{strategy_id}/validate", response_model=ValidationResponse)
def validate_strategy(
    strategy_id: UUID,
    definition: StrategyDefinitionValidate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ValidationResponse:
    """Validate a strategy definition without saving."""
    # Verify user owns the strategy
    get_user_strategy(strategy_id, user, session)

    errors: list[ValidationError] = []
    block_types = [b.type for b in definition.blocks]
    block_ids = {b.id for b in definition.blocks}

    # Rule 1: Must have entry and exit signals
    if "entry_signal" not in block_types:
        errors.append(
            ValidationError(
                code="MISSING_ENTRY",
                message="Entry Signal block is required",
            )
        )
    if "exit_signal" not in block_types:
        errors.append(
            ValidationError(
                code="MISSING_EXIT",
                message="Exit Signal block is required",
            )
        )

    # Rule 2: Entry/Exit signals must have input connections
    connected_targets = {conn.to_port.block_id for conn in definition.connections}
    for block in definition.blocks:
        if block.type in ("entry_signal", "exit_signal"):
            if block.id not in connected_targets:
                errors.append(
                    ValidationError(
                        block_id=block.id,
                        code="UNCONNECTED_SIGNAL",
                        message=f"{block.label} must have an input connection",
                    )
                )

    # Rule 3: At most one of each risk block type
    risk_counts = {"position_size": 0, "take_profit": 0, "stop_loss": 0}
    for block in definition.blocks:
        if block.type in risk_counts:
            risk_counts[block.type] += 1

    for risk_type, count in risk_counts.items():
        if count > 1:
            label = risk_type.replace("_", " ").title()
            errors.append(
                ValidationError(
                    code="DUPLICATE_RISK",
                    message=f"Only one {label} block allowed, found {count}",
                )
            )

    # Rule 4: Validate all connections reference existing blocks
    for conn in definition.connections:
        if conn.from_port.block_id not in block_ids:
            errors.append(
                ValidationError(
                    code="INVALID_CONNECTION",
                    message=f"Connection references non-existent block: {conn.from_port.block_id}",
                )
            )
        if conn.to_port.block_id not in block_ids:
            errors.append(
                ValidationError(
                    code="INVALID_CONNECTION",
                    message=f"Connection references non-existent block: {conn.to_port.block_id}",
                )
            )

    # Rule 5: Validate block parameters
    for block in definition.blocks:
        param_errors = _validate_block_params(block)
        errors.extend(param_errors)

    return ValidationResponse(
        status="valid" if not errors else "invalid",
        errors=errors,
    )
