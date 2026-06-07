"""Add analytics_consent to users (issue #533)

Revision ID: 038
Revises: 037
Create Date: 2026-06-07

Adds a nullable `analytics_consent` column to `users` with values:
  accepted | declined | NULL

NULL means undecided. Consent is per-device (localStorage); this column
holds the most recent device decision (last-writer-wins) so the worker
(which has no browser) can honor it server-side. See ADR-0007.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "038"
down_revision: Union[str, None] = "037"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLE_NAME = "users"
_COLUMN_NAME = "analytics_consent"


def upgrade() -> None:
    op.add_column(
        _TABLE_NAME,
        sa.Column(_COLUMN_NAME, sa.String(10), nullable=True),
    )


def downgrade() -> None:
    op.drop_column(_TABLE_NAME, _COLUMN_NAME)
