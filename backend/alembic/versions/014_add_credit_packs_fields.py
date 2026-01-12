"""Add credit packs fields to users table

Revision ID: 014
Revises: 013
Create Date: 2026-01-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add credit pack fields to users table
    op.add_column("users", sa.Column("backtest_credit_balance", sa.Integer, nullable=False, server_default="0"))
    op.add_column("users", sa.Column("extra_strategy_slots", sa.Integer, nullable=False, server_default="0"))


def downgrade() -> None:
    # Drop credit pack fields
    op.drop_column("users", "extra_strategy_slots")
    op.drop_column("users", "backtest_credit_balance")
