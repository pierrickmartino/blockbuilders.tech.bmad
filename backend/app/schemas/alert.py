from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.alert_rule import AlertType, Direction
from app.schemas.strategy import ALLOWED_ASSETS


class AlertRuleCreate(BaseModel):
    alert_type: AlertType

    # Performance alert fields
    strategy_id: Optional[UUID] = None
    threshold_pct: Optional[float] = Field(default=None, ge=0.1, le=100)
    alert_on_entry: bool = False
    alert_on_exit: bool = False

    # Price alert fields
    asset: Optional[str] = None
    direction: Optional[Direction] = None
    threshold_price: Optional[Decimal] = Field(default=None, gt=0)
    notify_webhook: bool = False
    webhook_url: Optional[str] = Field(default=None, max_length=500)
    expires_at: Optional[datetime] = None

    # Common fields
    notify_email: bool = False
    is_active: bool = True

    @model_validator(mode="after")
    def validate_by_type(self):
        """Validate fields based on alert type."""
        if self.alert_type == AlertType.PERFORMANCE:
            # Performance alerts require strategy_id
            if not self.strategy_id:
                raise ValueError("strategy_id required for performance alerts")
            # At least one performance condition required
            if not (self.threshold_pct is not None or self.alert_on_entry or self.alert_on_exit):
                raise ValueError("At least one performance condition must be enabled")
            # Price fields not allowed
            if self.asset or self.direction or self.threshold_price:
                raise ValueError("price fields not allowed for performance alerts")

        elif self.alert_type == AlertType.PRICE:
            # Price alerts require asset, direction, and threshold_price
            if not (self.asset and self.direction and self.threshold_price):
                raise ValueError("asset, direction, and threshold_price required for price alerts")
            # Validate asset
            if self.asset not in ALLOWED_ASSETS:
                raise ValueError(f"asset must be one of {ALLOWED_ASSETS}")
            # Webhook URL required if notify_webhook enabled
            if self.notify_webhook and not self.webhook_url:
                raise ValueError("webhook_url required when notify_webhook is true")
            # Performance fields not allowed
            if self.strategy_id or self.threshold_pct is not None or self.alert_on_entry or self.alert_on_exit:
                raise ValueError("performance fields not allowed for price alerts")

        return self


class AlertRuleUpdate(BaseModel):
    # Performance alert fields
    threshold_pct: Optional[float] = Field(default=None, ge=0.1, le=100)
    alert_on_entry: Optional[bool] = None
    alert_on_exit: Optional[bool] = None

    # Price alert fields
    threshold_price: Optional[Decimal] = Field(default=None, gt=0)
    notify_webhook: Optional[bool] = None
    webhook_url: Optional[str] = Field(default=None, max_length=500)
    expires_at: Optional[datetime] = None

    # Common fields
    notify_email: Optional[bool] = None
    is_active: Optional[bool] = None


class AlertRuleResponse(BaseModel):
    id: UUID
    user_id: UUID
    alert_type: AlertType

    # Performance alert fields
    strategy_id: Optional[UUID]
    metric: Optional[str]
    threshold_pct: Optional[float]
    alert_on_entry: bool
    alert_on_exit: bool
    last_triggered_run_id: Optional[UUID]

    # Price alert fields
    asset: Optional[str]
    direction: Optional[Direction]
    threshold_price: Optional[Decimal]
    notify_webhook: bool
    webhook_url: Optional[str]
    expires_at: Optional[datetime]
    last_checked_price: Optional[Decimal]

    # Common fields
    notify_in_app: bool
    notify_email: bool
    is_active: bool
    last_triggered_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
