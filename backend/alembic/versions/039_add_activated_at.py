"""Add activated_at to users with backfill (issue #535)

Revision ID: 039
Revises: 038
Create Date: 2026-06-07

Adds a nullable `activated_at` datetime column to `users` — the activation
anchor for the canonical `backtest_completed` event. Kept distinct from
`has_completed_onboarding` (a UI summary-card flag); see CONTEXT.md and
ADR-0007.

Backfills `activated_at = MIN(backtest_runs.created_at)` per user across
their completed runs, so already-activated users don't falsely report
`is_first` after deploy. Users with no completed run stay NULL. Events are
not replayed into PostHog (no historical consent records); pre-cutover
activation is computed from this column.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "039"
down_revision: Union[str, None] = "038"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLE_NAME = "users"
_COLUMN_NAME = "activated_at"

BACKFILL_SQL = """
UPDATE users
SET activated_at = (
    SELECT MIN(backtest_runs.created_at)
    FROM backtest_runs
    WHERE backtest_runs.user_id = users.id
      AND backtest_runs.status = 'completed'
)
WHERE id IN (
    SELECT DISTINCT user_id
    FROM backtest_runs
    WHERE status = 'completed'
)
"""


def upgrade() -> None:
    op.add_column(
        _TABLE_NAME,
        sa.Column(_COLUMN_NAME, sa.DateTime(), nullable=True),
    )
    op.execute(BACKFILL_SQL)


def downgrade() -> None:
    op.drop_column(_TABLE_NAME, _COLUMN_NAME)
