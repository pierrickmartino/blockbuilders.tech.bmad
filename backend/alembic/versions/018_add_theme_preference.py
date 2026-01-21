"""Add theme_preference to users

Revision ID: 018
Revises: 017
Create Date: 2026-01-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("theme_preference", sa.String(10), nullable=False, server_default="system"),
    )


def downgrade() -> None:
    op.drop_column("users", "theme_preference")
