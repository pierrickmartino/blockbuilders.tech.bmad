"""Initial schema - create core tables

Revision ID: 001
Revises:
Create Date: 2024-01-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("default_fee_percent", sa.Float(), nullable=True),
        sa.Column("default_slippage_percent", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # Strategies table
    op.create_table(
        "strategies",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("asset", sa.String(), nullable=False),
        sa.Column("timeframe", sa.String(), nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("auto_update_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_strategies_user_id"), "strategies", ["user_id"], unique=False)

    # Strategy versions table
    op.create_table(
        "strategy_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("strategy_id", sa.Uuid(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("definition_json", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["strategy_id"], ["strategies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_strategy_versions_strategy_id"), "strategy_versions", ["strategy_id"], unique=False)

    # Backtest runs table
    op.create_table(
        "backtest_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("strategy_id", sa.Uuid(), nullable=False),
        sa.Column("strategy_version_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("date_from", sa.DateTime(), nullable=False),
        sa.Column("date_to", sa.DateTime(), nullable=False),
        sa.Column("total_return", sa.Float(), nullable=True),
        sa.Column("cagr", sa.Float(), nullable=True),
        sa.Column("max_drawdown", sa.Float(), nullable=True),
        sa.Column("num_trades", sa.Integer(), nullable=True),
        sa.Column("win_rate", sa.Float(), nullable=True),
        sa.Column("results_storage_key", sa.String(), nullable=True),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["strategy_id"], ["strategies.id"]),
        sa.ForeignKeyConstraint(["strategy_version_id"], ["strategy_versions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_backtest_runs_strategy_id"), "backtest_runs", ["strategy_id"], unique=False)
    op.create_index(op.f("ix_backtest_runs_strategy_version_id"), "backtest_runs", ["strategy_version_id"], unique=False)
    op.create_index(op.f("ix_backtest_runs_user_id"), "backtest_runs", ["user_id"], unique=False)

    # Candles table
    op.create_table(
        "candles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("asset", sa.String(), nullable=False),
        sa.Column("timeframe", sa.String(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("open", sa.Float(), nullable=False),
        sa.Column("high", sa.Float(), nullable=False),
        sa.Column("low", sa.Float(), nullable=False),
        sa.Column("close", sa.Float(), nullable=False),
        sa.Column("volume", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("asset", "timeframe", "timestamp", name="uq_candle_asset_timeframe_timestamp"),
    )
    op.create_index(op.f("ix_candles_asset"), "candles", ["asset"], unique=False)
    op.create_index(op.f("ix_candles_timeframe"), "candles", ["timeframe"], unique=False)
    op.create_index(op.f("ix_candles_timestamp"), "candles", ["timestamp"], unique=False)


def downgrade() -> None:
    op.drop_table("candles")
    op.drop_table("backtest_runs")
    op.drop_table("strategy_versions")
    op.drop_table("strategies")
    op.drop_table("users")
