from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class AlertRuleCreate(BaseModel):
    strategy_id: UUID
    threshold_pct: Optional[float] = Field(default=None, ge=0.1, le=100)
    alert_on_entry: bool = False
    alert_on_exit: bool = False
    notify_email: bool = False
    is_active: bool = True

    @model_validator(mode="after")
    def check_at_least_one_condition(self):
        if not (self.threshold_pct is not None or self.alert_on_entry or self.alert_on_exit):
            raise ValueError("At least one alert condition must be enabled")
        return self


class AlertRuleUpdate(BaseModel):
    threshold_pct: Optional[float] = Field(default=None, ge=0.1, le=100)
    alert_on_entry: Optional[bool] = None
    alert_on_exit: Optional[bool] = None
    notify_email: Optional[bool] = None
    is_active: Optional[bool] = None


class AlertRuleResponse(BaseModel):
    id: UUID
    user_id: UUID
    strategy_id: UUID
    metric: str
    threshold_pct: Optional[float]
    alert_on_entry: bool
    alert_on_exit: bool
    notify_in_app: bool
    notify_email: bool
    is_active: bool
    last_triggered_run_id: Optional[UUID]
    last_triggered_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
