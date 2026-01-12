"""Add Stripe webhook events table

Revision ID: 015
Revises: 014
Create Date: 2026-01-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_id", sa.String(length=255), nullable=False),
        sa.Column("session_id", sa.String(length=255), nullable=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
        sa.UniqueConstraint("session_id"),
    )
    op.create_index(
        op.f("ix_stripe_webhook_events_event_id"),
        "stripe_webhook_events",
        ["event_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_stripe_webhook_events_session_id"),
        "stripe_webhook_events",
        ["session_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_stripe_webhook_events_session_id"), table_name="stripe_webhook_events")
    op.drop_index(op.f("ix_stripe_webhook_events_event_id"), table_name="stripe_webhook_events")
    op.drop_table("stripe_webhook_events")
