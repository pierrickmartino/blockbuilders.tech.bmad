from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.strategy_tag import StrategyTag
from app.models.user import User
from app.schemas.strategy import StrategyTagCreateRequest, StrategyTagResponse

router = APIRouter(prefix="/strategy-tags", tags=["strategy-tags"])


@router.get("/", response_model=list[StrategyTagResponse])
def list_tags(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[StrategyTagResponse]:
    """List all tags for the current user."""
    tags = session.exec(
        select(StrategyTag)
        .where(StrategyTag.user_id == user.id)
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


@router.post("/", response_model=StrategyTagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(
    data: StrategyTagCreateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyTagResponse:
    """Create a tag (idempotent by name)."""
    name_lower = data.name.strip().lower()

    # Check if tag already exists
    existing = session.exec(
        select(StrategyTag).where(
            StrategyTag.user_id == user.id,
            StrategyTag.name_lower == name_lower
        )
    ).first()

    if existing:
        return StrategyTagResponse(
            id=existing.id,
            name=existing.name,
            created_at=existing.created_at,
            updated_at=existing.updated_at,
        )

    # Create new tag
    tag = StrategyTag(
        user_id=user.id,
        name=data.name.strip(),
        name_lower=name_lower,
    )

    try:
        session.add(tag)
        session.commit()
        session.refresh(tag)
    except IntegrityError:
        # Race condition: another request created the same tag concurrently
        session.rollback()
        existing = session.exec(
            select(StrategyTag).where(
                StrategyTag.user_id == user.id,
                StrategyTag.name_lower == name_lower
            )
        ).first()
        if existing:
            return StrategyTagResponse(
                id=existing.id,
                name=existing.name,
                created_at=existing.created_at,
                updated_at=existing.updated_at,
            )
        raise  # Re-raise if it's a different integrity error

    return StrategyTagResponse(
        id=tag.id,
        name=tag.name,
        created_at=tag.created_at,
        updated_at=tag.updated_at,
    )


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Delete a tag and all its links (CASCADE)."""
    tag = session.exec(
        select(StrategyTag).where(
            StrategyTag.id == tag_id,
            StrategyTag.user_id == user.id
        )
    ).first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )

    session.delete(tag)
    session.commit()
