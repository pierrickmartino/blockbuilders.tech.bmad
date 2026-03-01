from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class DataQualityMetric(SQLModel, table=True):
    __tablename__ = "data_quality_metrics"
    __table_args__ = (
        UniqueConstraint("asset", "timeframe", "date", name="uq_data_quality"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    asset: str = Field(index=True)
    timeframe: str = Field(index=True)
    date: datetime = Field(index=True)
    gap_percent: float
    outlier_count: int
    volume_consistency: float
    has_issues: bool
    earliest_candle_date: date | None = Field(default=None)
    latest_candle_date: date | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
