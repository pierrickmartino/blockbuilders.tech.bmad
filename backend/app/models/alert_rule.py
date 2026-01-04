from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class AlertRule(SQLModel, table=True):
    __tablename__ = "alert_rules"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    strategy_id: UUID = Field(foreign_key="strategies.id", unique=True)
    metric: str = Field(default="max_drawdown_pct")
    threshold_pct: Optional[float] = None
    alert_on_entry: bool = Field(default=False)
    alert_on_exit: bool = Field(default=False)
    notify_in_app: bool = Field(default=True)
    notify_email: bool = Field(default=False)
    is_active: bool = Field(default=True)
    last_triggered_run_id: Optional[UUID] = Field(default=None, foreign_key="backtest_runs.id")
    last_triggered_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
