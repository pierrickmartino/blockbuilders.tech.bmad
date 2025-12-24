"""Add password reset and OAuth fields to users table

Revision ID: 007
Revises: 006
Create Date: 2024-12-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Password reset fields
    op.add_column("users", sa.Column("reset_token", sa.String(64), nullable=True))
    op.add_column("users", sa.Column("reset_token_expires_at", sa.DateTime, nullable=True))

    # OAuth fields
    op.add_column("users", sa.Column("auth_provider", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("provider_user_id", sa.String(100), nullable=True))

    # Make password_hash nullable for OAuth users
    op.alter_column("users", "password_hash", existing_type=sa.String(), nullable=True)

    # Index for password reset token lookups
    op.create_index("ix_users_reset_token", "users", ["reset_token"], unique=False)

    # Unique index for OAuth lookups (prevents duplicate OAuth accounts)
    op.create_index(
        "ix_users_oauth_provider",
        "users",
        ["auth_provider", "provider_user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_users_oauth_provider", table_name="users")
    op.drop_index("ix_users_reset_token", table_name="users")

    # Set placeholder password for OAuth-only users before making NOT NULL
    # This ensures downgrade doesn't fail
    op.execute(
        "UPDATE users SET password_hash = '[oauth-only-user-removed]' "
        "WHERE password_hash IS NULL"
    )

    op.alter_column("users", "password_hash", existing_type=sa.String(), nullable=False)
    op.drop_column("users", "provider_user_id")
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "reset_token_expires_at")
    op.drop_column("users", "reset_token")
