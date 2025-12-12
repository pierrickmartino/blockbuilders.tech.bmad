"""Add new fields to backtest_runs for Epic 4

Revision ID: 003
Revises: 002
Create Date: 2024-01-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add strategy snapshot fields
    op.add_column("backtest_runs", sa.Column("asset", sa.String(), nullable=False, server_default=""))
    op.add_column("backtest_runs", sa.Column("timeframe", sa.String(), nullable=False, server_default=""))
    # Add backtest parameter fields
    op.add_column("backtest_runs", sa.Column("initial_balance", sa.Float(), nullable=False, server_default="10000.0"))
    op.add_column("backtest_runs", sa.Column("fee_rate", sa.Float(), nullable=False, server_default="0.001"))
    op.add_column("backtest_runs", sa.Column("slippage_rate", sa.Float(), nullable=False, server_default="0.0005"))
    # Add storage key fields
    op.add_column("backtest_runs", sa.Column("equity_curve_key", sa.String(), nullable=True))
    op.add_column("backtest_runs", sa.Column("trades_key", sa.String(), nullable=True))
    # Remove old results_storage_key if exists (replaced by equity_curve_key and trades_key)
    op.drop_column("backtest_runs", "results_storage_key")


def downgrade() -> None:
    op.add_column("backtest_runs", sa.Column("results_storage_key", sa.String(), nullable=True))
    op.drop_column("backtest_runs", "trades_key")
    op.drop_column("backtest_runs", "equity_curve_key")
    op.drop_column("backtest_runs", "slippage_rate")
    op.drop_column("backtest_runs", "fee_rate")
    op.drop_column("backtest_runs", "initial_balance")
    op.drop_column("backtest_runs", "timeframe")
    op.drop_column("backtest_runs", "asset")
