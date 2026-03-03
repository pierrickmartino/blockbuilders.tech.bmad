import datetime as dt
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
    date: dt.datetime = Field(index=True)
    gap_percent: float
    outlier_count: int
    volume_consistency: float
    has_issues: bool
    earliest_candle_date: dt.date | None = Field(default=None)
    latest_candle_date: dt.date | None = Field(default=None)
    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.timezone.utc))
