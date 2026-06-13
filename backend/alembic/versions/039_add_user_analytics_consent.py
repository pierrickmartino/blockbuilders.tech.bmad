"""Add analytics_consent column to users

Revision ID: 039
Revises: 038
Create Date: 2026-06-13

Adds a nullable tri-state `analytics_consent` boolean to `users`:
None = undecided, True = accepted, False = declined. The client syncs its
local consent choice here after authentication so server-side analytics
(the worker) can honor a user's actual choice instead of emitting events
unconditionally.

No backfill: pre-existing rows read `null` (undecided) — server-side events
continue to fire for them, matching today's behavior, until the user makes
an explicit choice.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "039"
down_revision: Union[str, None] = "038"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("analytics_consent", sa.Boolean(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "analytics_consent")
