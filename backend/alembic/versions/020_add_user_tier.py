"""Add user_tier to users

Revision ID: 020
Revises: 019
Create Date: 2026-01-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "020"
down_revision: Union[str, None] = "019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("user_tier", sa.String(10), nullable=False, server_default="standard"),
    )

    # Backfill beta users (created before cutoff)
    op.execute("""
        UPDATE users
        SET user_tier = 'beta'
        WHERE created_at < '2026-01-24 00:00:00'
    """)


def downgrade() -> None:
    op.drop_column("users", "user_tier")
