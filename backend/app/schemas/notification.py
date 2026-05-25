from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class NotificationItem(BaseModel):
    id: UUID
    type: str
    title: str
    body: str
    link_url: Optional[str]
    is_read: bool
    created_at: datetime
    archived_at: Optional[datetime] = None


class NotificationListResponse(BaseModel):
    items: list[NotificationItem]
    unread_count: int
    total: int


class BulkIdsRequest(BaseModel):
    ids: list[UUID]
