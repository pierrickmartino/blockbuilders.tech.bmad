"""Add strategy_version_id and last_fired_candle_ts to alert_rules.

Revision ID: 042
Revises: 041
Create Date: 2026-06-17

Pins performance alerts to the frozen strategy version whose backtest result
the user was viewing when they enabled the alert. Adds a watermark column
(last_fired_candle_ts) so the daily dispatcher never re-fires for the same
closed candle.

Data migration: deactivates all existing performance-alert rows (they have no
version pin, so a guessed pin would fire on logic the user never chose), and
emits one in-app Notification per affected user explaining how to re-create
from a result.
"""
from datetime import datetime, timezone
from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "042"
down_revision: Union[str, None] = "041"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NOTIFICATION_BODY = (
    "We've improved how performance alerts work. Your existing alerts have been "
    "deactivated because they weren't linked to a specific strategy version. "
    "To re-enable, open a completed backtest result and click "
    "“Alert me when this triggers”."
)


def upgrade() -> None:
    op.add_column(
        "alert_rules",
        sa.Column("strategy_version_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "alert_rules",
        sa.Column("last_fired_candle_ts", sa.DateTime(), nullable=True),
    )
    try:
        op.create_foreign_key(
            "fk_alert_rules_strategy_version_id",
            "alert_rules",
            "strategy_versions",
            ["strategy_version_id"],
            ["id"],
            ondelete="SET NULL",
        )
    except Exception:
        # SQLite does not enforce FK constraints; skip if dialect doesn't support it
        pass

    conn = op.get_bind()

    # Collect users who have active performance alerts before we deactivate them
    rows = conn.execute(
        sa.text(
            "SELECT DISTINCT user_id FROM alert_rules "
            "WHERE alert_type = 'performance' AND is_active = TRUE"
        )
    ).fetchall()
    affected_user_ids = [str(row[0]) for row in rows]

    # Deactivate all existing performance alerts (no version pin → cannot dispatch)
    conn.execute(
        sa.text(
            "UPDATE alert_rules SET is_active = FALSE "
            "WHERE alert_type = 'performance'"
        )
    )

    # Create one migration notification per affected user
    now = datetime.now(timezone.utc).replace(tzinfo=None)  # store naive UTC
    for uid in affected_user_ids:
        conn.execute(
            sa.text(
                "INSERT INTO notifications "
                "(id, user_id, type, title, body, link_url, is_read, created_at) "
                "VALUES (:id, :user_id, :type, :title, :body, :link_url, :is_read, :created_at)"
            ),
            {
                "id": str(uuid4()),
                "user_id": uid,
                "type": "system",
                "title": "Performance alerts updated — action required",
                "body": _NOTIFICATION_BODY,
                "link_url": "/strategies",
                "is_read": False,
                "created_at": now,
            },
        )


def downgrade() -> None:
    try:
        op.drop_constraint(
            "fk_alert_rules_strategy_version_id",
            "alert_rules",
            type_="foreignkey",
        )
    except Exception:
        pass
    op.drop_column("alert_rules", "last_fired_candle_ts")
    op.drop_column("alert_rules", "strategy_version_id")
