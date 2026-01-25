"""Add risk metrics to backtest_runs

Revision ID: 022
Revises: 021
Create Date: 2026-01-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "022"
down_revision: Union[str, None] = "021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add risk metrics fields (nullable until backtest completes)
    op.add_column("backtest_runs", sa.Column("sharpe_ratio", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("sortino_ratio", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("calmar_ratio", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("max_consecutive_losses", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("backtest_runs", "max_consecutive_losses")
    op.drop_column("backtest_runs", "calmar_ratio")
    op.drop_column("backtest_runs", "sortino_ratio")
    op.drop_column("backtest_runs", "sharpe_ratio")
