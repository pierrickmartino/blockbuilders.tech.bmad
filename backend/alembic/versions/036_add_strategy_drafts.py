"""Add strategy_drafts table (working copy per ADR-0005)

Revision ID: 036
Revises: 035
Create Date: 2026-06-03

Creates strategy_drafts (1:1 with strategies) and backfills:
  1. Strategies with a version_number=0 draft row → migrate definition_json,
     then delete that row.
  2. Strategies with no draft but existing versions → seed from latest version.
  3. Strategies with nothing → seed with empty default definition.
"""

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "036"
down_revision: Union[str, None] = "035"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_DEFINITION = json.dumps({"blocks": [], "connections": [], "meta": {}})


def upgrade() -> None:
    op.create_table(
        "strategy_drafts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("strategy_id", sa.Uuid(), nullable=False),
        sa.Column("definition_json", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["strategy_id"], ["strategies.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("strategy_id", name="uq_strategy_drafts_strategy_id"),
    )
    op.create_index("ix_strategy_drafts_strategy_id", "strategy_drafts", ["strategy_id"])

    # 1. Migrate existing version_number=0 draft rows into strategy_drafts.
    op.execute(
        """
        INSERT INTO strategy_drafts (id, strategy_id, definition_json, updated_at)
        SELECT
            gen_random_uuid(),
            strategy_id,
            definition_json,
            NOW()
        FROM strategy_versions
        WHERE version_number = 0
        ON CONFLICT (strategy_id) DO NOTHING
        """
    )

    # 2. Delete the migrated draft rows from strategy_versions.
    op.execute("DELETE FROM strategy_versions WHERE version_number = 0")

    # 3. Seed working copies for strategies that still have none (from latest version).
    op.execute(
        f"""
        INSERT INTO strategy_drafts (id, strategy_id, definition_json, updated_at)
        SELECT
            gen_random_uuid(),
            s.id,
            COALESCE(
                (
                    SELECT sv.definition_json
                    FROM strategy_versions sv
                    WHERE sv.strategy_id = s.id
                    ORDER BY sv.version_number DESC
                    LIMIT 1
                ),
                '{DEFAULT_DEFINITION}'::json
            ),
            NOW()
        FROM strategies s
        WHERE s.id NOT IN (SELECT strategy_id FROM strategy_drafts)
        """
    )


def downgrade() -> None:
    # Re-insert draft rows back into strategy_versions from strategy_drafts.
    op.execute(
        """
        INSERT INTO strategy_versions (id, strategy_id, version_number, definition_json, created_at, status)
        SELECT
            gen_random_uuid(),
            strategy_id,
            0,
            definition_json,
            updated_at,
            'draft'
        FROM strategy_drafts
        """
    )

    op.drop_index("ix_strategy_drafts_strategy_id", table_name="strategy_drafts")
    op.drop_table("strategy_drafts")
