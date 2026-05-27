"""Add status column to strategy_versions

Revision ID: 034
Revises: 033
Create Date: 2026-05-27

Adds a `status` column to `strategy_versions` with three valid values:
  draft | published | archived

New rows default to 'draft'.
Existing rows are backfilled to 'published' because every version created
before this migration was a finalized save (i.e. effectively published).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "034"
down_revision: Union[str, None] = "033"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Column definition shared between upgrade/downgrade helpers
_COLUMN_NAME = "status"
_TABLE_NAME = "strategy_versions"
_BACKFILL_VALUE = "published"
_DEFAULT_VALUE = "draft"


def upgrade() -> None:
    # 1. Add the column as nullable first so the backfill can run safely
    #    on a table with existing rows.
    op.add_column(
        _TABLE_NAME,
        sa.Column(
            _COLUMN_NAME,
            sa.String(20),
            nullable=True,
        ),
    )

    # 2. Backfill all pre-existing rows to 'published'.
    op.execute(
        f"UPDATE {_TABLE_NAME} SET {_COLUMN_NAME} = '{_BACKFILL_VALUE}' "
        f"WHERE {_COLUMN_NAME} IS NULL"
    )

    # 3. Now that every row has a value, enforce NOT NULL + add server default.
    op.alter_column(
        _TABLE_NAME,
        _COLUMN_NAME,
        nullable=False,
        server_default=_DEFAULT_VALUE,
    )


def downgrade() -> None:
    op.drop_column(_TABLE_NAME, _COLUMN_NAME)
