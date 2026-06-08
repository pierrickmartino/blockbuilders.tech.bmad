"""Add entry_path column to strategies

Revision ID: 038
Revises: 037
Create Date: 2026-06-08

Adds a nullable `entry_path` column to `strategies`, typed to a Postgres
enum with exactly four values: wizard | blank_canvas | template_clone |
nl_wedge (CONTEXT.md → Entry path; ADR-0009).

No backfill: pre-existing rows read `null` and surface as the explicit
`unknown` cohort downstream — there is no heuristic reconstruction of a
path that was never recorded.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "038"
down_revision: Union[str, None] = "037"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ENUM_NAME = "strategy_entry_path_enum"
_ENUM_VALUES = ("wizard", "blank_canvas", "template_clone", "nl_wedge")


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE {_ENUM_NAME} AS ENUM "
        f"({', '.join(repr(v) for v in _ENUM_VALUES)})"
    )
    op.add_column(
        "strategies",
        sa.Column(
            "entry_path",
            sa.Enum(*_ENUM_VALUES, name=_ENUM_NAME),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("strategies", "entry_path")
    op.execute(f"DROP TYPE {_ENUM_NAME}")
