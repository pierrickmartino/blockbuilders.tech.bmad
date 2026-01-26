from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class Badge(BaseModel):
    key: str
    label: str


class Contributions(BaseModel):
    published_strategies: int
    completed_backtests: int


class PublishedStrategy(BaseModel):
    id: UUID
    name: str


class PublicProfileResponse(BaseModel):
    handle: str
    display_name: Optional[str]
    bio: Optional[str]
    follower_count: int
    published_strategies: Optional[List[PublishedStrategy]] = None
    contributions: Optional[Contributions] = None
    badges: Optional[List[Badge]] = None


class ProfileSettingsResponse(BaseModel):
    is_public: bool
    handle: Optional[str]
    display_name: Optional[str]
    bio: Optional[str]
    show_strategies: bool
    show_contributions: bool
    show_badges: bool
    follower_count: int


class ProfileUpdateRequest(BaseModel):
    is_public: Optional[bool] = None
    handle: Optional[str] = Field(default=None, min_length=3, max_length=30)
    display_name: Optional[str] = Field(default=None, max_length=100)
    bio: Optional[str] = Field(default=None, max_length=160)
    show_strategies: Optional[bool] = None
    show_contributions: Optional[bool] = None
    show_badges: Optional[bool] = None

    @field_validator("handle")
    @classmethod
    def validate_handle(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            if not v.replace("_", "").isalnum():
                raise ValueError("Handle must contain only letters, numbers, and underscores")
        return v
