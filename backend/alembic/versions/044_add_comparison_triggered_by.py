"""Add 'comparison' as a valid triggered_by value for backtest_runs.

Revision ID: 044
Revises: 043
Create Date: 2026-06-18

Comparison runs are engine re-runs of each strategy version over the
intersection window of two differing-window runs, used exclusively by
the Tweak coaching feature. They are tagged triggered_by='comparison' so
they can be walled off from run history, activation, and alert-pinning.

No column change is required (triggered_by is a plain String with no DB
constraint). This migration documents the third valid value and adds a
partial index to make the exclusion filter on history queries efficient.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "044"
down_revision: Union[str, None] = "043"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_backtest_runs_triggered_by",
        "backtest_runs",
        ["triggered_by"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_backtest_runs_triggered_by", table_name="backtest_runs")
