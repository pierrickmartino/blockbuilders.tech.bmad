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
    StrategyCreateRequest,
    StrategyResponse,
    StrategyUpdateRequest,
    StrategyVersionCreateRequest,
    StrategyVersionDetailResponse,
    StrategyVersionResponse,
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
