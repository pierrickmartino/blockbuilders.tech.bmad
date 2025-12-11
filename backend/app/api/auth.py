from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def signup(data: SignupRequest, session: Session = Depends(get_session)) -> AuthResponse:
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    token = create_access_token(str(user.id))
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            default_fee_percent=user.default_fee_percent,
            default_slippage_percent=user.default_slippage_percent,
        ),
    )


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, session: Session = Depends(get_session)) -> AuthResponse:
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(str(user.id))
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            default_fee_percent=user.default_fee_percent,
            default_slippage_percent=user.default_slippage_percent,
        ),
    )
