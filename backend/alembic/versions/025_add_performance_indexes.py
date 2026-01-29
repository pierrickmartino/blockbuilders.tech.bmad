"""Add performance indexes for common query patterns

Revision ID: 025_add_performance_indexes
Revises: 024_add_profile_fields
Create Date: 2025-01-29

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "025_add_performance_indexes"
down_revision = "024_add_profile_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Composite index for candle lookups - most common query pattern
    # Used by: fetch_candles, upsert_candles, backtest engine
    op.create_index(
        "ix_candle_asset_timeframe_timestamp",
        "candle",
        ["asset", "timeframe", "timestamp"],
        unique=True,
    )

    # Index for backtest run status queries (job processing, dashboard filtering)
    op.create_index(
        "ix_backtest_run_status",
        "backtest_run",
        ["status"],
    )

    # Index for backtest runs by user (dashboard, history pages)
    op.create_index(
        "ix_backtest_run_user_created",
        "backtest_run",
        ["user_id", "created_at"],
    )

    # Composite index for alert rule queries
    op.create_index(
        "ix_alert_rule_type_active",
        "alert_rule",
        ["alert_type", "is_active"],
    )

    # Index for active alerts by user
    op.create_index(
        "ix_alert_rule_user_active",
        "alert_rule",
        ["user_id", "is_active"],
    )

    # Pagination indexes for created_at on commonly listed tables
    op.create_index(
        "ix_strategy_user_created",
        "strategy",
        ["user_id", "created_at"],
    )

    op.create_index(
        "ix_notification_user_created",
        "notification",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_notification_user_created", table_name="notification")
    op.drop_index("ix_strategy_user_created", table_name="strategy")
    op.drop_index("ix_alert_rule_user_active", table_name="alert_rule")
    op.drop_index("ix_alert_rule_type_active", table_name="alert_rule")
    op.drop_index("ix_backtest_run_user_created", table_name="backtest_run")
    op.drop_index("ix_backtest_run_status", table_name="backtest_run")
    op.drop_index("ix_candle_asset_timeframe_timestamp", table_name="candle")
