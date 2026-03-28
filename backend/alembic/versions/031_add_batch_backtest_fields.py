"""Add batch_id and period_key to backtest_runs

Revision ID: 031
Revises: 030
Create Date: 2026-03-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "031"
down_revision: Union[str, None] = "030"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("backtest_runs", sa.Column("batch_id", sa.Uuid(), nullable=True))
    op.add_column("backtest_runs", sa.Column("period_key", sa.String(), nullable=True))
    op.create_index("ix_backtest_runs_batch_id", "backtest_runs", ["batch_id"])


def downgrade() -> None:
    op.drop_index("ix_backtest_runs_batch_id", table_name="backtest_runs")
    op.drop_column("backtest_runs", "period_key")
    op.drop_column("backtest_runs", "batch_id")
