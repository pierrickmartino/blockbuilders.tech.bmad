"""Add last_drawdown_pct to alert_rules for drawdown crossing state.

Revision ID: 042
Revises: 041
Create Date: 2026-06-17

Stores the drawdown percentage from the previous evaluation so the daily
dispatcher can detect level-crossings (below→above threshold) rather than
re-firing every candle while the strategy is in drawdown.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "042"
down_revision: Union[str, None] = "041"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "alert_rules",
        sa.Column("last_drawdown_pct", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("alert_rules", "last_drawdown_pct")
