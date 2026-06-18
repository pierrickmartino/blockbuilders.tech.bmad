"""Add lesson_completions table

Revision ID: 041
Revises: 040
Create Date: 2026-06-16

Write-once, monotonic record stamped the first time a user views the verdict
of a backtest on a strategy whose source_template_id maps (via the Curriculum
registry) to a Lesson. Unique on (user_id, lesson_id); survives strategy
deletion (no FK to strategies).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "041"
down_revision: Union[str, None] = "040"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lesson_completions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("lesson_id", sa.String(length=100), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "lesson_id", name="uq_lesson_completion_user_lesson"),
    )
    op.create_index("ix_lesson_completions_user_id", "lesson_completions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_lesson_completions_user_id", table_name="lesson_completions")
    op.drop_table("lesson_completions")
