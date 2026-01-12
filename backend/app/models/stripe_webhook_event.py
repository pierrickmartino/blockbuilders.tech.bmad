from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class StripeWebhookEvent(SQLModel, table=True):
    __tablename__ = "stripe_webhook_events"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    event_id: str = Field(max_length=255, unique=True, index=True)
    session_id: Optional[str] = Field(default=None, max_length=255, unique=True, index=True)
    event_type: str = Field(max_length=100)
    created_at: datetime = Field(default_factory=datetime.utcnow)
