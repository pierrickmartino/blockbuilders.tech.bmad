from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field
from sqlalchemy import UniqueConstraint


class Candle(SQLModel, table=True):
    __tablename__ = "candles"
    __table_args__ = (
        UniqueConstraint("asset", "timeframe", "timestamp", name="uq_candle_asset_timeframe_timestamp"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    asset: str = Field(index=True)
    timeframe: str = Field(index=True)
    timestamp: datetime = Field(index=True)
    open: float
    high: float
    low: float
    close: float
    volume: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
