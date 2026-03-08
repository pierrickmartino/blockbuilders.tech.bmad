"""Add educational fields to strategy_templates

Revision ID: 029
Revises: 028
Create Date: 2026-03-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "029"
down_revision: Union[str, None] = "028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "strategy_templates",
        sa.Column("teaches_description", sa.Text(), nullable=True),
    )
    op.add_column(
        "strategy_templates",
        sa.Column(
            "difficulty",
            sa.String(),
            nullable=False,
            server_default="beginner",
        ),
    )
    op.add_column(
        "strategy_templates",
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )

    # Backfill existing templates with difficulty and sort_order
    op.execute(
        """
        UPDATE strategy_templates
        SET teaches_description = 'Learn how RSI measures momentum and how oversold/overbought zones signal potential reversals. This is the simplest indicator-based strategy pattern.',
            difficulty = 'beginner',
            sort_order = 1
        WHERE name = 'RSI Oversold Bounce'
        """
    )
    op.execute(
        """
        UPDATE strategy_templates
        SET teaches_description = 'Understand how moving average crossovers identify trend changes. This foundational pattern is the basis of most trend-following strategies.',
            difficulty = 'beginner',
            sort_order = 2
        WHERE name = 'MA Crossover'
        """
    )
    op.execute(
        """
        UPDATE strategy_templates
        SET teaches_description = 'Explore how Bollinger Bands measure volatility and how breakouts above the bands can signal strong momentum moves.',
            difficulty = 'intermediate',
            sort_order = 3
        WHERE name = 'Bollinger Breakout'
        """
    )


def downgrade() -> None:
    op.drop_column("strategy_templates", "sort_order")
    op.drop_column("strategy_templates", "difficulty")
    op.drop_column("strategy_templates", "teaches_description")
