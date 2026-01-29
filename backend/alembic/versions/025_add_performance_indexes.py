"""Add performance indexes for common query patterns

Revision ID: 025
Revises: 024
Create Date: 2025-01-29

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "025"
down_revision: Union[str, None] = "024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Composite index for candle lookups - most common query pattern
    # Used by: fetch_candles, upsert_candles, backtest engine
    op.create_index(
        "ix_candles_asset_timeframe_timestamp",
        "candles",
        ["asset", "timeframe", "timestamp"],
        unique=True,
    )

    # Index for backtest run status queries (job processing, dashboard filtering)
    op.create_index(
        "ix_backtest_runs_status",
        "backtest_runs",
        ["status"],
    )

    # Index for backtest runs by user (dashboard, history pages)
    op.create_index(
        "ix_backtest_runs_user_created",
        "backtest_runs",
        ["user_id", "created_at"],
    )

    # Composite index for alert rule queries
    op.create_index(
        "ix_alert_rules_type_active",
        "alert_rules",
        ["alert_type", "is_active"],
    )

    # Index for active alerts by user
    op.create_index(
        "ix_alert_rules_user_active",
        "alert_rules",
        ["user_id", "is_active"],
    )

    # Pagination indexes for created_at on commonly listed tables
    op.create_index(
        "ix_strategies_user_created",
        "strategies",
        ["user_id", "created_at"],
    )

    op.create_index(
        "ix_notifications_user_created",
        "notifications",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_user_created", table_name="notifications")
    op.drop_index("ix_strategies_user_created", table_name="strategies")
    op.drop_index("ix_alert_rules_user_active", table_name="alert_rules")
    op.drop_index("ix_alert_rules_type_active", table_name="alert_rules")
    op.drop_index("ix_backtest_runs_user_created", table_name="backtest_runs")
    op.drop_index("ix_backtest_runs_status", table_name="backtest_runs")
    op.drop_index("ix_candles_asset_timeframe_timestamp", table_name="candles")
