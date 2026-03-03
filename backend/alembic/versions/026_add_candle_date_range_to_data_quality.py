"""Add earliest/latest candle date columns to data_quality_metrics

Revision ID: 026
Revises: 025
Create Date: 2026-03-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "026"
down_revision: Union[str, None] = "025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "data_quality_metrics",
        sa.Column("earliest_candle_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "data_quality_metrics",
        sa.Column("latest_candle_date", sa.Date(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("data_quality_metrics", "latest_candle_date")
    op.drop_column("data_quality_metrics", "earliest_candle_date")
