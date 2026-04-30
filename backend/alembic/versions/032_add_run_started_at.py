"""Add started_at to backtest_runs for elapsed time tracking

Revision ID: 032
Revises: 031
Create Date: 2026-04-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "032"
down_revision: Union[str, None] = "031"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "backtest_runs",
        sa.Column("started_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("backtest_runs", "started_at")
