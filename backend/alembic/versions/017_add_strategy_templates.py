"""Add strategy_templates table for curated strategy library

Revision ID: 017
Revises: 016
Create Date: 2026-01-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlmodel import Session

revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create strategy_templates table
    op.create_table(
        "strategy_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("logic_summary", sa.String(length=500), nullable=False),
        sa.Column("use_cases", postgresql.JSON, nullable=False),
        sa.Column("parameter_ranges", postgresql.JSON, nullable=False),
        sa.Column("definition_json", postgresql.JSON, nullable=False),
        sa.Column("source", sa.String, nullable=False),
        sa.Column("status", sa.String, nullable=False),
        sa.Column("asset", sa.String, nullable=False),
        sa.Column("timeframe", sa.String, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # Seed initial templates
    from app.data.seed_templates import seed_initial_templates

    bind = op.get_bind()
    session = Session(bind=bind)
    seed_initial_templates(session)


def downgrade() -> None:
    op.drop_table("strategy_templates")
