from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import model_validator
from sqlalchemy import Enum as SAEnum
from sqlmodel import Column, Field, SQLModel


class AlertType(str, Enum):
    PERFORMANCE = "performance"
    PRICE = "price"


class Direction(str, Enum):
    ABOVE = "above"
    BELOW = "below"


class AlertRule(SQLModel, table=True):
    __tablename__ = "alert_rules"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    alert_type: AlertType = Field(
        default=AlertType.PERFORMANCE,
        sa_column=Column(
            SAEnum(AlertType, values_callable=lambda e: [m.value for m in e]),
            nullable=False,
        ),
    )

    # Performance alert fields
    strategy_id: Optional[UUID] = Field(default=None, foreign_key="strategies.id")
    metric: str = Field(default="max_drawdown_pct")
    threshold_pct: Optional[float] = None
    alert_on_entry: bool = Field(default=False)
    alert_on_exit: bool = Field(default=False)
    last_triggered_run_id: Optional[UUID] = Field(default=None, foreign_key="backtest_runs.id")

    # Price alert fields
    asset: Optional[str] = None
    direction: Optional[Direction] = Field(
        default=None,
        sa_column=Column(
            SAEnum(Direction, values_callable=lambda e: [m.value for m in e]),
            nullable=True,
        ),
    )
    threshold_price: Optional[Decimal] = None
    notify_webhook: bool = Field(default=False)
    webhook_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    last_checked_price: Optional[Decimal] = None

    # Common fields
    notify_in_app: bool = Field(default=True)
    notify_email: bool = Field(default=False)
    is_active: bool = Field(default=True)
    last_triggered_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode='after')
    def validate_alert_type_fields(self):
        """Validate fields based on alert type."""
        if self.alert_type == AlertType.PERFORMANCE:
            # Performance alerts require strategy_id
            if not self.strategy_id:
                raise ValueError("strategy_id required for performance alerts")
            # Performance alerts should not have price fields
            if self.asset or self.direction or self.threshold_price:
                raise ValueError("price fields not allowed for performance alerts")

        elif self.alert_type == AlertType.PRICE:
            # Price alerts should not have strategy_id
            if self.strategy_id:
                raise ValueError("strategy_id not allowed for price alerts")
            # Price alerts require asset, direction, and threshold_price
            if not (self.asset and self.direction and self.threshold_price):
                raise ValueError("asset, direction, and threshold_price required for price alerts")
            # Validate asset against allowed assets
            from app.schemas.strategy import ALLOWED_ASSETS
            if self.asset not in ALLOWED_ASSETS:
                raise ValueError(f"asset must be one of {ALLOWED_ASSETS}")

        return self
