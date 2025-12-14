"""Add scheduled re-backtest fields for Epic 6

Revision ID: 004
Revises: 003
Create Date: 2024-01-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # strategies table - add lookback days and last auto-run timestamp
    op.add_column(
        "strategies",
        sa.Column("auto_update_lookback_days", sa.Integer(), nullable=False, server_default="365"),
    )
    op.add_column(
        "strategies",
        sa.Column("last_auto_run_at", sa.DateTime(), nullable=True),
    )
    # backtest_runs table - add triggered_by field
    op.add_column(
        "backtest_runs",
        sa.Column("triggered_by", sa.String(), nullable=False, server_default="manual"),
    )
    # users table - add per-user daily backtest limit
    op.add_column(
        "users",
        sa.Column("max_backtests_per_day", sa.Integer(), nullable=False, server_default="50"),
    )


def downgrade() -> None:
    op.drop_column("users", "max_backtests_per_day")
    op.drop_column("backtest_runs", "triggered_by")
    op.drop_column("strategies", "last_auto_run_at")
    op.drop_column("strategies", "auto_update_lookback_days")
