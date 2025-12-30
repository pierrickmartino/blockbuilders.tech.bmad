"""Add benchmark metrics to backtest_runs

Revision ID: 008
Revises: 007
Create Date: 2025-12-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add benchmark metrics fields
    op.add_column("backtest_runs", sa.Column("benchmark_return", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("alpha", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("beta", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("benchmark_equity_curve_key", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("backtest_runs", "benchmark_equity_curve_key")
    op.drop_column("backtest_runs", "beta")
    op.drop_column("backtest_runs", "alpha")
    op.drop_column("backtest_runs", "benchmark_return")
