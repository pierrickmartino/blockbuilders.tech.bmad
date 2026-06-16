"""Add source_template_id column to strategies

Revision ID: 039
Revises: 038
Create Date: 2026-06-16

Adds a nullable `source_template_id` FK column to `strategies` pointing at
`strategy_templates.id`. Populated by the template-clone route; all other
creation paths leave it null — no backfill.
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
        "strategies",
        sa.Column(
            "source_template_id",
            sa.UUID(),
            sa.ForeignKey("strategy_templates.id"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("strategies", "source_template_id")
