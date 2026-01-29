from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import ValidationError as PydanticValidationError
from sqlmodel import Session, select, func, and_

from app.api.deps import get_current_user
from app.core.database import get_session
from app.core.plans import get_plan_limits
from app.models.alert_rule import AlertRule
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_tag import StrategyTag
from app.models.strategy_tag_link import StrategyTagLink
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.schemas.strategy import (
    Block,
    BulkStrategyRequest,
    BulkStrategyResponse,
    BulkStrategyTagRequest,
    StrategyCreateRequest,
    StrategyDefinitionValidate,
    StrategyResponse,
    StrategyTagResponse,
    StrategyUpdateRequest,
    StrategyVersionCreateRequest,
    StrategyVersionDetailResponse,
    StrategyVersionResponse,
    StrategyWithMetricsResponse,
    ValidationError,
    ValidationResponse,
)
from app.validation.error_messages import get_error_message

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


def load_strategy_tags(strategy_id: UUID, session: Session) -> list[StrategyTagResponse]:
    """Load all tags for a strategy."""
    tags = session.exec(
        select(StrategyTag)
        .join(StrategyTagLink, StrategyTag.id == StrategyTagLink.tag_id)
        .where(StrategyTagLink.strategy_id == strategy_id)
        .order_by(StrategyTag.name)
    ).all()

    return [
        StrategyTagResponse(
            id=tag.id,
            name=tag.name,
            created_at=tag.created_at,
            updated_at=tag.updated_at,
        )
        for tag in tags
    ]


def batch_load_strategy_tags(
    strategy_ids: list[UUID], session: Session
) -> dict[UUID, list[StrategyTagResponse]]:
    """Load all tags for multiple strategies in a single query.

    Returns a dict mapping strategy_id -> list of tags.
    """
    if not strategy_ids:
        return {}

    # Single query to fetch all tags for all strategies
    results = session.exec(
        select(StrategyTagLink.strategy_id, StrategyTag)
        .join(StrategyTag, StrategyTag.id == StrategyTagLink.tag_id)
        .where(StrategyTagLink.strategy_id.in_(strategy_ids))
        .order_by(StrategyTag.name)
    ).all()

    # Group tags by strategy_id
    tags_by_strategy: dict[UUID, list[StrategyTagResponse]] = {
        sid: [] for sid in strategy_ids
    }
    for strategy_id, tag in results:
        tags_by_strategy[strategy_id].append(
            StrategyTagResponse(
                id=tag.id,
                name=tag.name,
                created_at=tag.created_at,
                updated_at=tag.updated_at,
            )
        )

    return tags_by_strategy


@router.post("/", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
def create_strategy(
    data: StrategyCreateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyResponse:
    """Create a new strategy."""
    # Check strategy limit based on plan tier
    active_count = session.exec(
        select(func.count(Strategy.id)).where(
            Strategy.user_id == user.id,
            Strategy.is_archived == False,  # noqa: E712
        )
    ).one()
    from app.core.plans import get_effective_limits

    effective_limits = get_effective_limits(
        user.plan_tier, user.user_tier, user.extra_strategy_slots
    )
    max_allowed = effective_limits["max_strategies"]
    if active_count >= max_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Strategy limit reached ({max_allowed}). Upgrade your plan, purchase additional slots, or archive existing strategies.",
        )

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
        tags=[],
    )


@router.get("/", response_model=list[StrategyWithMetricsResponse])
def list_strategies(
    search: str = Query(default="", description="Filter by name (case-insensitive)"),
    include_archived: bool = Query(default=False, description="Include archived strategies"),
    tag_ids: list[UUID] | None = Query(default=None, description="Filter by tag IDs (OR logic)"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[StrategyWithMetricsResponse]:
    """List all strategies for the current user with latest backtest metrics."""
    # Subquery to get a deterministic latest completed backtest per strategy.
    # Break ties on identical created_at using the highest id.
    latest_run_subquery = (
        select(
            BacktestRun.id.label("latest_run_id"),
            BacktestRun.strategy_id,
            func.row_number()
            .over(
                partition_by=BacktestRun.strategy_id,
                order_by=(BacktestRun.created_at.desc(), BacktestRun.id.desc()),
            )
            .label("row_number"),
        )
        .where(BacktestRun.status == "completed")
        .subquery()
    )
    latest_run_subquery = (
        select(
            latest_run_subquery.c.latest_run_id,
            latest_run_subquery.c.strategy_id,
        )
        .where(latest_run_subquery.c.row_number == 1)
        .subquery()
    )

    # Main query with LEFT JOIN to include metrics
    query = (
        select(Strategy, BacktestRun)
        .outerjoin(
            latest_run_subquery,
            Strategy.id == latest_run_subquery.c.strategy_id,
        )
        .outerjoin(
            BacktestRun,
            and_(
                BacktestRun.id == latest_run_subquery.c.latest_run_id,
            ),
        )
        .where(Strategy.user_id == user.id)
    )

    if not include_archived:
        query = query.where(Strategy.is_archived == False)  # noqa: E712

    if search:
        query = query.where(Strategy.name.ilike(f"%{search}%"))

    # Filter by tags (OR logic: show strategies that have ANY of the selected tags)
    if tag_ids:
        query = query.where(
            Strategy.id.in_(
                select(StrategyTagLink.strategy_id).where(
                    StrategyTagLink.tag_id.in_(tag_ids)
                )
            )
        )

    query = query.order_by(Strategy.updated_at.desc())
    results = session.exec(query).all()

    # Batch load all tags in a single query (fixes N+1)
    strategy_ids = [s.id for s, _ in results]
    tags_by_strategy = batch_load_strategy_tags(strategy_ids, session)

    return [
        StrategyWithMetricsResponse(
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
            latest_total_return_pct=backtest.total_return if backtest else None,
            latest_max_drawdown_pct=backtest.max_drawdown if backtest else None,
            latest_win_rate_pct=backtest.win_rate if backtest else None,
            latest_num_trades=backtest.num_trades if backtest else None,
            last_run_at=backtest.created_at if backtest else None,
            tags=tags_by_strategy.get(s.id, []),
        )
        for s, backtest in results
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
        tags=load_strategy_tags(strategy_id, session),
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

    # Handle tag updates
    if data.tag_ids is not None:
        unique_tag_ids = list(dict.fromkeys(data.tag_ids)) if data.tag_ids else []
        # Validate that all tags belong to the user
        if unique_tag_ids:
            tag_count = session.exec(
                select(func.count(StrategyTag.id)).where(
                    StrategyTag.id.in_(unique_tag_ids),
                    StrategyTag.user_id == user.id
                )
            ).one()
            if tag_count != len(unique_tag_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more tags do not exist or do not belong to you"
                )

        # Delete existing links in bulk
        session.query(StrategyTagLink).filter(
            StrategyTagLink.strategy_id == strategy_id
        ).delete()

        # Create new links
        for tag_id in unique_tag_ids:
            link = StrategyTagLink(strategy_id=strategy_id, tag_id=tag_id)
            session.add(link)

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
        tags=load_strategy_tags(strategy_id, session),
    )


@router.post("/{strategy_id}/duplicate", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
def duplicate_strategy(
    strategy_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyResponse:
    """Duplicate a strategy with its latest version."""
    # Check strategy limit based on plan tier
    active_count = session.exec(
        select(func.count(Strategy.id)).where(
            Strategy.user_id == user.id,
            Strategy.is_archived == False,  # noqa: E712
        )
    ).one()
    from app.core.plans import get_effective_limits

    effective_limits = get_effective_limits(
        user.plan_tier, user.user_tier, user.extra_strategy_slots
    )
    max_allowed = effective_limits["max_strategies"]
    if active_count >= max_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Strategy limit reached ({max_allowed}). Upgrade your plan, purchase additional slots, or archive existing strategies.",
        )

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

    try:
        definition = StrategyDefinitionValidate.model_validate(data.definition)
    except PydanticValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        ) from exc

    errors = _collect_validation_errors(definition)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Strategy definition failed validation",
                "errors": [error.model_dump() for error in errors],
            },
        )

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

    # Constant block validation
    if block.type == "constant":
        value = params.get("value", 0)
        if not isinstance(value, (int, float)):
            user_msg, help_link = get_error_message("INVALID_VALUE", min_val=-1_000_000, max_val=1_000_000)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_VALUE",
                    message=f"Constant value must be a number, got {type(value).__name__}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )
        elif not -1_000_000 <= value <= 1_000_000:
            user_msg, help_link = get_error_message("INVALID_VALUE", min_val=-1_000_000, max_val=1_000_000)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_VALUE",
                    message=f"Constant value must be between -1,000,000 and 1,000,000, got {value}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    # Period validations for indicators
    if block.type in ("sma", "ema", "bollinger", "atr"):
        period = params.get("period", 0)
        if not isinstance(period, (int, float)) or not 1 <= period <= 500:
            user_msg, help_link = get_error_message("INVALID_PERIOD", min_val=1, max_val=500)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERIOD",
                    message=f"Period must be 1-500, got {period}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    if block.type == "rsi":
        period = params.get("period", 0)
        if not isinstance(period, (int, float)) or not 2 <= period <= 100:
            user_msg, help_link = get_error_message("INVALID_PERIOD", min_val=2, max_val=100)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERIOD",
                    message=f"RSI period must be 2-100, got {period}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    if block.type == "macd":
        fast = params.get("fast_period", 0)
        slow = params.get("slow_period", 0)
        signal = params.get("signal_period", 0)
        if not isinstance(fast, (int, float)) or not 1 <= fast <= 50:
            user_msg, help_link = get_error_message("INVALID_PARAM", param_name="MACD fast period", min_val=1, max_val=50)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PARAM",
                    message=f"MACD fast period must be 1-50, got {fast}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )
        if not isinstance(slow, (int, float)) or not 1 <= slow <= 200:
            user_msg, help_link = get_error_message("INVALID_PARAM", param_name="MACD slow period", min_val=1, max_val=200)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PARAM",
                    message=f"MACD slow period must be 1-200, got {slow}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )
        if not isinstance(signal, (int, float)) or not 1 <= signal <= 50:
            user_msg, help_link = get_error_message("INVALID_PARAM", param_name="MACD signal period", min_val=1, max_val=50)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PARAM",
                    message=f"MACD signal period must be 1-50, got {signal}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    # Risk block validations
    if block.type == "position_size":
        value = params.get("value", 0)
        if not isinstance(value, (int, float)) or not 1 <= value <= 100:
            user_msg, help_link = get_error_message("INVALID_PERCENT", min_val=1, max_val=100)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERCENT",
                    message=f"Position size must be 1-100%, got {value}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    if block.type == "take_profit":
        # Support both new levels format and legacy take_profit_pct
        levels = params.get("levels")
        if levels and isinstance(levels, list):
            # Validate levels format
            if not 1 <= len(levels) <= 3:
                user_msg, help_link = get_error_message("INVALID_LEVELS")
                errors.append(
                    ValidationError(
                        block_id=block.id,
                        code="INVALID_LEVELS",
                        message=f"Take profit must have 1-3 levels, got {len(levels)}",
                        user_message=user_msg,
                        help_link=help_link,
                    )
                )
            else:
                total_close = 0
                prev_profit = 0.0
                for idx, lvl in enumerate(levels):
                    if not isinstance(lvl, dict):
                        user_msg, help_link = get_error_message("INVALID_LEVEL", level_num=idx+1)
                        errors.append(
                            ValidationError(
                                block_id=block.id,
                                code="INVALID_LEVEL",
                                message=f"Level {idx+1} must be an object",
                                user_message=user_msg,
                                help_link=help_link,
                            )
                        )
                        continue
                    profit_pct = lvl.get("profit_pct", 0)
                    close_pct = lvl.get("close_pct", 0)
                    if not isinstance(profit_pct, (int, float)) or profit_pct <= 0:
                        user_msg, help_link = get_error_message("INVALID_PROFIT", level_num=idx+1)
                        errors.append(
                            ValidationError(
                                block_id=block.id,
                                code="INVALID_PROFIT",
                                message=f"Level {idx+1} profit_pct must be > 0",
                                user_message=user_msg,
                                help_link=help_link,
                            )
                        )
                    elif profit_pct <= prev_profit:
                        user_msg, help_link = get_error_message("INVALID_PROFIT_ORDER", level_num=idx+1)
                        errors.append(
                            ValidationError(
                                block_id=block.id,
                                code="INVALID_PROFIT_ORDER",
                                message=f"Level {idx+1} profit must be > previous level",
                                user_message=user_msg,
                                help_link=help_link,
                            )
                        )
                    prev_profit = float(profit_pct)
                    if not isinstance(close_pct, (int, float)) or not 1 <= close_pct <= 100:
                        user_msg, help_link = get_error_message("INVALID_CLOSE", level_num=idx+1)
                        errors.append(
                            ValidationError(
                                block_id=block.id,
                                code="INVALID_CLOSE",
                                message=f"Level {idx+1} close_pct must be 1-100%",
                                user_message=user_msg,
                                help_link=help_link,
                            )
                        )
                    total_close += close_pct
                if total_close > 100:
                    user_msg, help_link = get_error_message("INVALID_TOTAL_CLOSE", total=total_close)
                    errors.append(
                        ValidationError(
                            block_id=block.id,
                            code="INVALID_TOTAL_CLOSE",
                            message=f"Total close % cannot exceed 100%, got {total_close}%",
                            user_message=user_msg,
                            help_link=help_link,
                        )
                    )
        else:
            # Legacy format: take_profit_pct
            pct = params.get("take_profit_pct", 0)
            if not isinstance(pct, (int, float)) or not 0.1 <= pct <= 100:
                user_msg, help_link = get_error_message("INVALID_PERCENT", min_val=0.1, max_val=100)
                errors.append(
                    ValidationError(
                        block_id=block.id,
                        code="INVALID_PERCENT",
                        message=f"Take profit must be 0.1-100%, got {pct}",
                        user_message=user_msg,
                        help_link=help_link,
                    )
                )

    if block.type == "stop_loss":
        pct = params.get("stop_loss_pct", 0)
        if not isinstance(pct, (int, float)) or not 0.1 <= pct <= 100:
            user_msg, help_link = get_error_message("INVALID_PERCENT", min_val=0.1, max_val=100)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERCENT",
                    message=f"Stop loss must be 0.1-100%, got {pct}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    if block.type == "max_drawdown":
        pct = params.get("max_drawdown_pct", 0)
        if not isinstance(pct, (int, float)) or not 0.1 <= pct <= 100:
            user_msg, help_link = get_error_message("INVALID_PERCENT", min_val=0.1, max_val=100)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERCENT",
                    message=f"Max drawdown must be 0.1-100%, got {pct}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    elif block.type == "time_exit":
        bars = params.get("bars", 0)
        if not isinstance(bars, (int, float)) or bars < 1:
            user_msg, help_link = get_error_message("INVALID_BARS")
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_BARS",
                    message=f"Time Exit bars must be >= 1, got {bars}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    elif block.type == "trailing_stop":
        trail_pct = params.get("trail_pct", 0)
        if not isinstance(trail_pct, (int, float)) or not 0 < trail_pct <= 100:
            user_msg, help_link = get_error_message("INVALID_PERCENT", min_val=0.1, max_val=100)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERCENT",
                    message=f"Trailing stop must be 0-100%, got {trail_pct}",
                    user_message=user_msg,
                    help_link=help_link,
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

    errors = _collect_validation_errors(definition)

    return ValidationResponse(
        status="valid" if not errors else "invalid",
        errors=errors,
    )


def _collect_validation_errors(definition: StrategyDefinitionValidate) -> list[ValidationError]:
    errors: list[ValidationError] = []
    block_types = [b.type for b in definition.blocks]
    block_ids = {b.id for b in definition.blocks}

    # Rule 1: Must have at least one entry signal and at least one exit condition
    entry_count = block_types.count("entry_signal")
    if entry_count == 0:
        user_msg, help_link = get_error_message("MISSING_ENTRY")
        errors.append(
            ValidationError(
                code="MISSING_ENTRY",
                message="At least one Entry Signal block is required",
                user_message=user_msg,
                help_link=help_link,
            )
        )

    # Count exit conditions (signal OR rule)
    exit_signal_count = block_types.count("exit_signal")
    exit_rule_types = ("time_exit", "trailing_stop", "stop_loss", "take_profit", "max_drawdown")
    exit_rule_count = sum(1 for t in block_types if t in exit_rule_types)
    if exit_signal_count == 0 and exit_rule_count == 0:
        user_msg, help_link = get_error_message("MISSING_EXIT")
        errors.append(
            ValidationError(
                code="MISSING_EXIT",
                message="At least one exit condition required (Exit Signal or Risk block)",
                user_message=user_msg,
                help_link=help_link,
            )
        )

    # Rule 2: Entry/Exit signals must have input connections
    connected_targets = {conn.to_port.block_id for conn in definition.connections}
    for block in definition.blocks:
        if block.type in ("entry_signal", "exit_signal"):
            if block.id not in connected_targets:
                signal_type = "Entry Signal" if block.type == "entry_signal" else "Exit Signal"
                user_msg, help_link = get_error_message("UNCONNECTED_SIGNAL", signal_type=signal_type)
                errors.append(
                    ValidationError(
                        block_id=block.id,
                        code="UNCONNECTED_SIGNAL",
                        message=f"{block.label} must have an input connection",
                        user_message=user_msg,
                        help_link=help_link,
                    )
                )

    # Rule 3: At most one of each risk block type
    risk_counts = {
        "position_size": 0,
        "take_profit": 0,
        "stop_loss": 0,
        "max_drawdown": 0,
        "time_exit": 0,
        "trailing_stop": 0,
    }
    for block in definition.blocks:
        if block.type in risk_counts:
            risk_counts[block.type] += 1

    for risk_type, count in risk_counts.items():
        if count > 1:
            label = risk_type.replace("_", " ").title()
            user_msg, help_link = get_error_message("DUPLICATE_RISK", block_type=label)
            errors.append(
                ValidationError(
                    code="DUPLICATE_RISK",
                    message=f"Only one {label} block allowed, found {count}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    # Rule 4: Validate all connections reference existing blocks
    for conn in definition.connections:
        if conn.from_port.block_id not in block_ids:
            user_msg, help_link = get_error_message("INVALID_CONNECTION")
            errors.append(
                ValidationError(
                    code="INVALID_CONNECTION",
                    message=f"Connection references non-existent block: {conn.from_port.block_id}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )
        if conn.to_port.block_id not in block_ids:
            user_msg, help_link = get_error_message("INVALID_CONNECTION")
            errors.append(
                ValidationError(
                    code="INVALID_CONNECTION",
                    message=f"Connection references non-existent block: {conn.to_port.block_id}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    # Rule 5: Validate block parameters
    for block in definition.blocks:
        param_errors = _validate_block_params(block)
        errors.extend(param_errors)

    return errors


# Bulk operations
@router.post("/bulk/archive", response_model=BulkStrategyResponse)
def bulk_archive_strategies(
    data: BulkStrategyRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BulkStrategyResponse:
    """Archive multiple strategies."""
    success_count = 0
    failed_ids = []

    for strategy_id in data.strategy_ids:
        try:
            strategy = get_user_strategy(strategy_id, user, session)
            strategy.is_archived = True
            strategy.updated_at = datetime.now(timezone.utc)
            session.add(strategy)
            session.commit()
            success_count += 1
        except HTTPException:
            failed_ids.append(strategy_id)
        except Exception:
            session.rollback()
            failed_ids.append(strategy_id)

    return BulkStrategyResponse(
        success_count=success_count,
        failed_count=len(failed_ids),
        failed_ids=failed_ids,
    )


@router.post("/bulk/tag", response_model=BulkStrategyResponse)
def bulk_tag_strategies(
    data: BulkStrategyTagRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BulkStrategyResponse:
    """Apply tags to multiple strategies (replaces existing tags)."""
    # Validate all tags belong to user
    tag_count = session.exec(
        select(func.count(StrategyTag.id)).where(
            StrategyTag.id.in_(data.tag_ids),
            StrategyTag.user_id == user.id,
        )
    ).one()
    if tag_count != len(data.tag_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more tags do not exist or do not belong to you",
        )

    success_count = 0
    failed_ids = []

    for strategy_id in data.strategy_ids:
        try:
            strategy = get_user_strategy(strategy_id, user, session)

            # Delete existing tag links
            session.exec(
                select(StrategyTagLink).where(StrategyTagLink.strategy_id == strategy_id)
            ).all()
            session.query(StrategyTagLink).filter(
                StrategyTagLink.strategy_id == strategy_id
            ).delete()

            # Create new tag links
            for tag_id in data.tag_ids:
                link = StrategyTagLink(strategy_id=strategy_id, tag_id=tag_id)
                session.add(link)

            strategy.updated_at = datetime.now(timezone.utc)
            session.add(strategy)
            session.commit()
            success_count += 1
        except HTTPException:
            session.rollback()
            failed_ids.append(strategy_id)
        except Exception:
            session.rollback()
            failed_ids.append(strategy_id)

    return BulkStrategyResponse(
        success_count=success_count,
        failed_count=len(failed_ids),
        failed_ids=failed_ids,
    )


@router.post("/bulk/delete", response_model=BulkStrategyResponse)
def bulk_delete_strategies(
    data: BulkStrategyRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BulkStrategyResponse:
    """Permanently delete multiple strategies and all related data."""
    # First pass: verify ownership for all strategies, collect valid ones
    valid_strategies = []
    failed_ids = []

    for strategy_id in data.strategy_ids:
        try:
            strategy = get_user_strategy(strategy_id, user, session)
            valid_strategies.append((strategy_id, strategy))
        except HTTPException:
            failed_ids.append(strategy_id)

    if not valid_strategies:
        return BulkStrategyResponse(
            success_count=0,
            failed_count=len(failed_ids),
            failed_ids=failed_ids,
        )

    # Second pass: delete all valid strategies in batched operations
    valid_ids = [sid for sid, _ in valid_strategies]
    try:
        # Bulk delete dependent rows
        session.query(AlertRule).filter(AlertRule.strategy_id.in_(valid_ids)).delete(
            synchronize_session=False
        )
        session.query(BacktestRun).filter(BacktestRun.strategy_id.in_(valid_ids)).delete(
            synchronize_session=False
        )
        session.query(StrategyVersion).filter(
            StrategyVersion.strategy_id.in_(valid_ids)
        ).delete(synchronize_session=False)
        session.query(StrategyTagLink).filter(
            StrategyTagLink.strategy_id.in_(valid_ids)
        ).delete(synchronize_session=False)

        # Delete the strategies themselves
        session.query(Strategy).filter(Strategy.id.in_(valid_ids)).delete(
            synchronize_session=False
        )
        session.commit()

        return BulkStrategyResponse(
            success_count=len(valid_strategies),
            failed_count=len(failed_ids),
            failed_ids=failed_ids,
        )
    except Exception:
        session.rollback()
        # If bulk delete fails, all valid strategies are marked as failed
        failed_ids.extend(valid_ids)
        return BulkStrategyResponse(
            success_count=0,
            failed_count=len(failed_ids),
            failed_ids=failed_ids,
        )
