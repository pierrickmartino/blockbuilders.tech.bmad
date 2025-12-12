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
    # Strategy snapshot
    asset: str = Field(default="")
    timeframe: str = Field(default="")
    # Date range
    date_from: datetime
    date_to: datetime
    # Backtest parameters
    initial_balance: float = Field(default=10000.0)
    fee_rate: float = Field(default=0.001)
    slippage_rate: float = Field(default=0.0005)
    # Summary metrics (nullable until run completes)
    total_return: Optional[float] = None
    cagr: Optional[float] = None
    max_drawdown: Optional[float] = None
    num_trades: Optional[int] = None
    win_rate: Optional[float] = None
    # Storage keys for detailed results
    equity_curve_key: Optional[str] = None
    trades_key: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
