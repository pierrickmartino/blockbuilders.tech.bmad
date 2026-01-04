"""Add alert_rules table

Revision ID: 011
Revises: 010
Create Date: 2026-01-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create alert_rules table
    op.create_table(
        "alert_rules",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("strategy_id", sa.Uuid(), nullable=False),
        sa.Column("metric", sa.String(), nullable=False),
        sa.Column("threshold_pct", sa.Float(), nullable=True),
        sa.Column("alert_on_entry", sa.Boolean(), nullable=False),
        sa.Column("alert_on_exit", sa.Boolean(), nullable=False),
        sa.Column("notify_in_app", sa.Boolean(), nullable=False),
        sa.Column("notify_email", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("last_triggered_run_id", sa.Uuid(), nullable=True),
        sa.Column("last_triggered_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["strategy_id"], ["strategies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["last_triggered_run_id"], ["backtest_runs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("strategy_id", name="uq_alert_rule_strategy_id"),
    )
    # Individual index on user_id
    op.create_index(op.f("ix_alert_rules_user_id"), "alert_rules", ["user_id"], unique=False)
    # Composite index for efficient queries by user and strategy
    op.create_index(
        "ix_alert_rules_user_strategy",
        "alert_rules",
        ["user_id", "strategy_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_alert_rules_user_strategy", table_name="alert_rules")
    op.drop_index(op.f("ix_alert_rules_user_id"), table_name="alert_rules")
    op.drop_table("alert_rules")
