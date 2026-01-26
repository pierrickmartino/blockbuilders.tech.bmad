"""Add transaction cost analysis fields

Revision ID: 023
Revises: 022
Create Date: 2026-01-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "023"
down_revision: Union[str, None] = "022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add user default spread preference
    op.add_column("users", sa.Column("default_spread_percent", sa.Float(), nullable=True))

    # Add spread_rate to backtest_runs (with default for existing rows)
    op.add_column("backtest_runs", sa.Column("spread_rate", sa.Float(), nullable=False, server_default="0.0002"))

    # Add cost breakdown fields to backtest_runs (nullable until backtest completes)
    op.add_column("backtest_runs", sa.Column("gross_return_usd", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("gross_return_pct", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("total_fees_usd", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("total_slippage_usd", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("total_spread_usd", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("total_costs_usd", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("cost_pct_gross_return", sa.Float(), nullable=True))
    op.add_column("backtest_runs", sa.Column("avg_cost_per_trade_usd", sa.Float(), nullable=True))


def downgrade() -> None:
    # Drop backtest_runs cost fields
    op.drop_column("backtest_runs", "avg_cost_per_trade_usd")
    op.drop_column("backtest_runs", "cost_pct_gross_return")
    op.drop_column("backtest_runs", "total_costs_usd")
    op.drop_column("backtest_runs", "total_spread_usd")
    op.drop_column("backtest_runs", "total_slippage_usd")
    op.drop_column("backtest_runs", "total_fees_usd")
    op.drop_column("backtest_runs", "gross_return_pct")
    op.drop_column("backtest_runs", "gross_return_usd")
    op.drop_column("backtest_runs", "spread_rate")

    # Drop user default spread field
    op.drop_column("users", "default_spread_percent")
