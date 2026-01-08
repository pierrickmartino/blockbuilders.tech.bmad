"""Add strategy_tags and strategy_tag_links tables

Revision ID: 012
Revises: 011
Create Date: 2026-01-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create strategy_tags table
    op.create_table(
        "strategy_tags",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("name_lower", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name_lower", name="uq_strategy_tag_user_name"),
    )
    op.create_index(op.f("ix_strategy_tags_user_id"), "strategy_tags", ["user_id"], unique=False)
    op.create_index(op.f("ix_strategy_tags_name_lower"), "strategy_tags", ["name_lower"], unique=False)

    # Create strategy_tag_links junction table
    op.create_table(
        "strategy_tag_links",
        sa.Column("strategy_id", sa.Uuid(), nullable=False),
        sa.Column("tag_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["strategy_id"], ["strategies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["strategy_tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("strategy_id", "tag_id"),
    )
    op.create_index(op.f("ix_strategy_tag_links_tag_id"), "strategy_tag_links", ["tag_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_strategy_tag_links_tag_id"), table_name="strategy_tag_links")
    op.drop_table("strategy_tag_links")
    op.drop_index(op.f("ix_strategy_tags_name_lower"), table_name="strategy_tags")
    op.drop_index(op.f("ix_strategy_tags_user_id"), table_name="strategy_tags")
    op.drop_table("strategy_tags")
