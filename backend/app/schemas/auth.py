from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    default_fee_percent: Optional[float] = None
    default_slippage_percent: Optional[float] = None


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class UserUpdateRequest(BaseModel):
    default_fee_percent: Optional[float] = Field(default=None, ge=0, le=5)
    default_slippage_percent: Optional[float] = Field(default=None, ge=0, le=5)
