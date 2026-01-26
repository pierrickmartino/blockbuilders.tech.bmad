"""Add profile fields for user profiles and reputation

Revision ID: 024
Revises: 023
Create Date: 2026-01-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "024"
down_revision: Union[str, None] = "023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add profile fields to users table
    op.add_column("users", sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("users", sa.Column("handle", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("display_name", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("bio", sa.String(length=160), nullable=True))
    op.add_column("users", sa.Column("show_strategies", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("users", sa.Column("show_contributions", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("users", sa.Column("show_badges", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("users", sa.Column("follower_count", sa.Integer(), nullable=False, server_default="0"))

    # Create unique index on handle (where not null)
    op.create_index("ix_users_handle", "users", ["handle"], unique=True, postgresql_where=sa.text("handle IS NOT NULL"))

    # Add is_published field to strategies table
    op.add_column("strategies", sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    # Drop strategies fields
    op.drop_column("strategies", "is_published")

    # Drop index and users fields
    op.drop_index("ix_users_handle", table_name="users", postgresql_where=sa.text("handle IS NOT NULL"))
    op.drop_column("users", "follower_count")
    op.drop_column("users", "show_badges")
    op.drop_column("users", "show_contributions")
    op.drop_column("users", "show_strategies")
    op.drop_column("users", "bio")
    op.drop_column("users", "display_name")
    op.drop_column("users", "handle")
    op.drop_column("users", "is_public")
