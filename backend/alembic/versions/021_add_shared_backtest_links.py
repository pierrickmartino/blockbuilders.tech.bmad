"""Add shared_backtest_links table

Revision ID: 021
Revises: 020
Create Date: 2026-01-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "021"
down_revision: Union[str, None] = "020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "shared_backtest_links",
        sa.Column("id", UUID(), nullable=False),
        sa.Column("backtest_run_id", UUID(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["backtest_run_id"],
            ["backtest_runs.id"],
            name="fk_shared_backtest_links_backtest_run_id",
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        "ix_shared_backtest_links_token",
        "shared_backtest_links",
        ["token"],
        unique=True,
    )
    op.create_index(
        "ix_shared_backtest_links_backtest_run_id",
        "shared_backtest_links",
        ["backtest_run_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_shared_backtest_links_backtest_run_id", table_name="shared_backtest_links")
    op.drop_index("ix_shared_backtest_links_token", table_name="shared_backtest_links")
    op.drop_table("shared_backtest_links")
