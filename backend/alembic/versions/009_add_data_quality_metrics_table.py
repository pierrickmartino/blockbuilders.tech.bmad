"""Add data quality metrics table

Revision ID: 009
Revises: 008
Create Date: 2026-01-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create data_quality_metrics table
    op.create_table(
        "data_quality_metrics",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("asset", sa.String(), nullable=False),
        sa.Column("timeframe", sa.String(), nullable=False),
        sa.Column("date", sa.DateTime(), nullable=False),
        sa.Column("gap_percent", sa.Float(), nullable=False),
        sa.Column("outlier_count", sa.Integer(), nullable=False),
        sa.Column("volume_consistency", sa.Float(), nullable=False),
        sa.Column("has_issues", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("asset", "timeframe", "date", name="uq_data_quality"),
    )
    op.create_index(op.f("ix_data_quality_metrics_asset"), "data_quality_metrics", ["asset"], unique=False)
    op.create_index(op.f("ix_data_quality_metrics_timeframe"), "data_quality_metrics", ["timeframe"], unique=False)
    op.create_index(op.f("ix_data_quality_metrics_date"), "data_quality_metrics", ["date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_data_quality_metrics_date"), table_name="data_quality_metrics")
    op.drop_index(op.f("ix_data_quality_metrics_timeframe"), table_name="data_quality_metrics")
    op.drop_index(op.f("ix_data_quality_metrics_asset"), table_name="data_quality_metrics")
    op.drop_table("data_quality_metrics")
