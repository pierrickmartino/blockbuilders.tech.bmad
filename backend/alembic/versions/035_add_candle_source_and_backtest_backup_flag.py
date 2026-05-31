"""Add candles.source and backtest_runs.used_backup_data

Revision ID: 035
Revises: 034
Create Date: 2026-05-31

candles.source     — tracks which price provider produced each row.
                     Existing rows are backfilled to 'cryptocompare' (the
                     only provider that existed before this migration).

backtest_runs.used_backup_data — boolean flag set to true when a run
                     consumed any Binance-sourced candles.
                     Existing rows default to false.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "035"
down_revision: Union[str, None] = "034"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- candles.source ---------------------------------------------------
    # 1. Add nullable so existing rows aren't rejected.
    op.add_column(
        "candles",
        sa.Column("source", sa.String(32), nullable=True),
    )
    # 2. Backfill: every pre-existing candle came from CryptoCompare.
    op.execute("UPDATE candles SET source = 'cryptocompare' WHERE source IS NULL")
    # 3. Enforce NOT NULL + server default for future inserts.
    op.alter_column("candles", "source", nullable=False, server_default="cryptocompare")

    # --- backtest_runs.used_backup_data -----------------------------------
    op.add_column(
        "backtest_runs",
        sa.Column("used_backup_data", sa.Boolean(), nullable=True),
    )
    op.execute("UPDATE backtest_runs SET used_backup_data = FALSE WHERE used_backup_data IS NULL")
    op.alter_column("backtest_runs", "used_backup_data", nullable=False, server_default=sa.false())


def downgrade() -> None:
    op.drop_column("backtest_runs", "used_backup_data")
    op.drop_column("candles", "source")
