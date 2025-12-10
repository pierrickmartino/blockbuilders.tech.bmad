from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field


class BacktestRun(SQLModel, table=True):
    __tablename__ = "backtest_runs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    strategy_id: UUID = Field(foreign_key="strategies.id", index=True)
    strategy_version_id: UUID = Field(foreign_key="strategy_versions.id", index=True)
    status: str = Field(default="pending")  # pending, running, completed, failed
    date_from: datetime
    date_to: datetime
    # Summary metrics (nullable until run completes)
    total_return: Optional[float] = None
    cagr: Optional[float] = None
    max_drawdown: Optional[float] = None
    num_trades: Optional[int] = None
    win_rate: Optional[float] = None
    results_storage_key: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
