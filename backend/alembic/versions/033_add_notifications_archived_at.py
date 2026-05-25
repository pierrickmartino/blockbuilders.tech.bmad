"""Add archived_at to notifications and update composite index

Revision ID: 033
Revises: 032
Create Date: 2026-05-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "033"
down_revision: Union[str, None] = "032"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.drop_index("ix_notifications_user_read_created", table_name="notifications")
    op.create_index(
        "ix_notifications_user_archived_read_created",
        "notifications",
        ["user_id", "archived_at", "is_read", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_user_archived_read_created", table_name="notifications")
    op.create_index(
        "ix_notifications_user_read_created",
        "notifications",
        ["user_id", "is_read", "created_at"],
        unique=False,
    )
    op.drop_column("notifications", "archived_at")
