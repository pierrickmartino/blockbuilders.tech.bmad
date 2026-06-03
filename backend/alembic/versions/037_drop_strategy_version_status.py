"""Drop status column from strategy_versions (issue #517)

Revision ID: 037
Revises: 036
Create Date: 2026-06-03

strategy_versions is now a genuinely immutable log:
  (id, strategy_id, version_number, definition_json, created_at)

The status column (and VersionStatus enum) are removed because
version-level archive was superseded by the freeze-on-backtest flow.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "037"
down_revision: Union[str, None] = "036"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLE_NAME = "strategy_versions"
_COLUMN_NAME = "status"
_BACKFILL_VALUE = "published"
_DEFAULT_VALUE = "draft"


def upgrade() -> None:
    op.drop_column(_TABLE_NAME, _COLUMN_NAME)


def downgrade() -> None:
    op.add_column(
        _TABLE_NAME,
        sa.Column(_COLUMN_NAME, sa.String(20), nullable=True),
    )
    op.execute(
        f"UPDATE {_TABLE_NAME} SET {_COLUMN_NAME} = '{_BACKFILL_VALUE}' "
        f"WHERE {_COLUMN_NAME} IS NULL"
    )
    op.alter_column(
        _TABLE_NAME,
        _COLUMN_NAME,
        nullable=False,
        server_default=_DEFAULT_VALUE,
    )
