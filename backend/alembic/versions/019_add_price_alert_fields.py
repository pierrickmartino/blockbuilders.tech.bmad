"""Add price alert fields to alert_rules

Revision ID: 019
Revises: 018
Create Date: 2026-01-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "019"
down_revision: Union[str, None] = "018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop unique constraint on strategy_id (allows multiple price alerts per asset)
    op.drop_constraint("uq_alert_rule_strategy_id", "alert_rules", type_="unique")

    # Make strategy_id nullable (price alerts don't have strategy_id)
    op.alter_column("alert_rules", "strategy_id", nullable=True)

    # Create enum types for alert_type and direction
    op.execute("CREATE TYPE alert_type_enum AS ENUM ('performance', 'price')")
    op.execute("CREATE TYPE direction_enum AS ENUM ('above', 'below')")

    # Add alert_type column with default 'performance' for existing rows
    op.add_column(
        "alert_rules",
        sa.Column(
            "alert_type",
            sa.Enum("performance", "price", name="alert_type_enum"),
            nullable=False,
            server_default="performance"
        )
    )

    # Add price alert fields (all nullable)
    op.add_column("alert_rules", sa.Column("asset", sa.String(), nullable=True))
    op.add_column(
        "alert_rules",
        sa.Column(
            "direction",
            sa.Enum("above", "below", name="direction_enum"),
            nullable=True
        )
    )
    op.add_column(
        "alert_rules",
        sa.Column("threshold_price", sa.Numeric(precision=18, scale=8), nullable=True)
    )
    op.add_column(
        "alert_rules",
        sa.Column("notify_webhook", sa.Boolean(), nullable=False, server_default="false")
    )
    op.add_column("alert_rules", sa.Column("webhook_url", sa.String(), nullable=True))
    op.add_column("alert_rules", sa.Column("expires_at", sa.DateTime(), nullable=True))
    op.add_column(
        "alert_rules",
        sa.Column("last_checked_price", sa.Numeric(precision=18, scale=8), nullable=True)
    )

    # Add composite index for price alert queries
    op.create_index(
        "ix_alert_rules_type_asset_active",
        "alert_rules",
        ["alert_type", "asset", "is_active"],
        unique=False
    )

    # Add composite index for user-scoped filtering by type
    op.create_index(
        "ix_alert_rules_user_type",
        "alert_rules",
        ["user_id", "alert_type"],
        unique=False
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_alert_rules_user_type", table_name="alert_rules")
    op.drop_index("ix_alert_rules_type_asset_active", table_name="alert_rules")

    # Drop columns
    op.drop_column("alert_rules", "last_checked_price")
    op.drop_column("alert_rules", "expires_at")
    op.drop_column("alert_rules", "webhook_url")
    op.drop_column("alert_rules", "notify_webhook")
    op.drop_column("alert_rules", "threshold_price")
    op.drop_column("alert_rules", "direction")
    op.drop_column("alert_rules", "asset")
    op.drop_column("alert_rules", "alert_type")

    # Drop enum types
    op.execute("DROP TYPE direction_enum")
    op.execute("DROP TYPE alert_type_enum")

    # Restore strategy_id to not nullable
    op.alter_column("alert_rules", "strategy_id", nullable=False)

    # Restore unique constraint on strategy_id
    op.create_unique_constraint("uq_alert_rule_strategy_id", "alert_rules", ["strategy_id"])
