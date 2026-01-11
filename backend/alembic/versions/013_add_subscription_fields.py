"""Add subscription fields to users table

Revision ID: 013
Revises: 012
Create Date: 2026-01-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add subscription fields to users table
    op.add_column("users", sa.Column("plan_tier", sa.String(20), nullable=False, server_default="free"))
    op.add_column("users", sa.Column("plan_interval", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("stripe_subscription_id", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("subscription_status", sa.String(20), nullable=True))

    # Create indexes for Stripe IDs for webhook lookups
    op.create_index(op.f("ix_users_stripe_customer_id"), "users", ["stripe_customer_id"], unique=True)
    op.create_index(op.f("ix_users_stripe_subscription_id"), "users", ["stripe_subscription_id"], unique=True)


def downgrade() -> None:
    # Drop indexes first
    op.drop_index(op.f("ix_users_stripe_subscription_id"), table_name="users")
    op.drop_index(op.f("ix_users_stripe_customer_id"), table_name="users")

    # Drop columns
    op.drop_column("users", "subscription_status")
    op.drop_column("users", "stripe_subscription_id")
    op.drop_column("users", "stripe_customer_id")
    op.drop_column("users", "plan_interval")
    op.drop_column("users", "plan_tier")
