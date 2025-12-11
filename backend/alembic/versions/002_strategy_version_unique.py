"""Add unique constraint on strategy_versions (strategy_id, version_number)

Revision ID: 002
Revises: 001
Create Date: 2024-01-01

"""
from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_strategy_version_strategy_id_version_number",
        "strategy_versions",
        ["strategy_id", "version_number"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_strategy_version_strategy_id_version_number",
        "strategy_versions",
        type_="unique",
    )
