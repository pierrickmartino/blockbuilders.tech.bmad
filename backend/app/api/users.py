from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.user import User
from app.schemas.auth import UserResponse, UserUpdateRequest

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        default_fee_percent=user.default_fee_percent,
        default_slippage_percent=user.default_slippage_percent,
    )


@router.put("/me", response_model=UserResponse)
def update_me(
    data: UserUpdateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> UserResponse:
    if data.default_fee_percent is not None:
        user.default_fee_percent = data.default_fee_percent
    if data.default_slippage_percent is not None:
        user.default_slippage_percent = data.default_slippage_percent
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserResponse(
        id=user.id,
        email=user.email,
        default_fee_percent=user.default_fee_percent,
        default_slippage_percent=user.default_slippage_percent,
    )
