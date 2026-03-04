"""Add has_completed_onboarding to users with backfill

Revision ID: 028
Revises: 027
Create Date: 2026-03-04

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "028"
down_revision: Union[str, None] = "027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "has_completed_onboarding",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    # Backfill: mark users with at least one completed backtest as onboarded
    op.execute(
        """
        UPDATE users
        SET has_completed_onboarding = true
        WHERE id IN (
            SELECT DISTINCT user_id
            FROM backtest_runs
            WHERE status = 'completed'
        )
        """
    )


def downgrade() -> None:
    op.drop_column("users", "has_completed_onboarding")
