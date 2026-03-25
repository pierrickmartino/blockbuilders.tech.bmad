"""Fix strategy template connections and remove orphan blocks

Fixes:
- Compare block port names: "a"/"b" -> "left"/"right" to match BLOCK_REGISTRY
- Connection format: "from"/"to" -> "from_port"/"to_port" for consistency
- Removes price blocks with invalid connections to indicator blocks (which have no input ports)
- Removes standalone stop_loss blocks (risk blocks have no ports and are not part of core strategy logic)

Revision ID: 030
Revises: 029
Create Date: 2026-03-25

"""
import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "030"
down_revision: Union[str, None] = "029"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Updated definitions keyed by template name
FIXED_DEFINITIONS = {
    "RSI Oversold Bounce": {
        "blocks": [
            {
                "id": "rsi-1",
                "type": "rsi",
                "label": "RSI (14)",
                "position": {"x": 100, "y": 200},
                "params": {"period": 14, "source": "close"},
            },
            {
                "id": "const-oversold",
                "type": "constant",
                "label": "Oversold (30)",
                "position": {"x": 100, "y": 100},
                "params": {"value": 30},
            },
            {
                "id": "const-overbought",
                "type": "constant",
                "label": "Overbought (70)",
                "position": {"x": 100, "y": 300},
                "params": {"value": 70},
            },
            {
                "id": "compare-entry",
                "type": "compare",
                "label": "RSI < 30",
                "position": {"x": 300, "y": 150},
                "params": {"operator": "<"},
            },
            {
                "id": "entry-1",
                "type": "entry_signal",
                "label": "Entry Signal",
                "position": {"x": 500, "y": 150},
                "params": {},
            },
            {
                "id": "compare-exit",
                "type": "compare",
                "label": "RSI > 70",
                "position": {"x": 300, "y": 300},
                "params": {"operator": ">"},
            },
            {
                "id": "exit-1",
                "type": "exit_signal",
                "label": "Exit Signal",
                "position": {"x": 500, "y": 300},
                "params": {},
            },
        ],
        "connections": [
            {"from_port": {"block_id": "rsi-1", "port": "output"}, "to_port": {"block_id": "compare-entry", "port": "left"}},
            {"from_port": {"block_id": "const-oversold", "port": "output"}, "to_port": {"block_id": "compare-entry", "port": "right"}},
            {"from_port": {"block_id": "compare-entry", "port": "output"}, "to_port": {"block_id": "entry-1", "port": "signal"}},
            {"from_port": {"block_id": "rsi-1", "port": "output"}, "to_port": {"block_id": "compare-exit", "port": "left"}},
            {"from_port": {"block_id": "const-overbought", "port": "output"}, "to_port": {"block_id": "compare-exit", "port": "right"}},
            {"from_port": {"block_id": "compare-exit", "port": "output"}, "to_port": {"block_id": "exit-1", "port": "signal"}},
        ],
        "meta": {},
    },
    "MA Crossover": {
        "blocks": [
            {
                "id": "sma-fast",
                "type": "sma",
                "label": "Fast SMA (10)",
                "position": {"x": 100, "y": 100},
                "params": {"period": 10, "source": "close"},
            },
            {
                "id": "sma-slow",
                "type": "sma",
                "label": "Slow SMA (30)",
                "position": {"x": 100, "y": 300},
                "params": {"period": 30, "source": "close"},
            },
            {
                "id": "crossover-entry",
                "type": "crossover",
                "label": "Entry Crossover",
                "position": {"x": 300, "y": 100},
                "params": {"direction": "crosses_above"},
            },
            {
                "id": "entry-1",
                "type": "entry_signal",
                "label": "Entry Signal",
                "position": {"x": 500, "y": 100},
                "params": {},
            },
            {
                "id": "crossover-exit",
                "type": "crossover",
                "label": "Exit Crossover",
                "position": {"x": 300, "y": 300},
                "params": {"direction": "crosses_below"},
            },
            {
                "id": "exit-1",
                "type": "exit_signal",
                "label": "Exit Signal",
                "position": {"x": 500, "y": 300},
                "params": {},
            },
        ],
        "connections": [
            {"from_port": {"block_id": "sma-fast", "port": "output"}, "to_port": {"block_id": "crossover-entry", "port": "fast"}},
            {"from_port": {"block_id": "sma-slow", "port": "output"}, "to_port": {"block_id": "crossover-entry", "port": "slow"}},
            {"from_port": {"block_id": "crossover-entry", "port": "output"}, "to_port": {"block_id": "entry-1", "port": "signal"}},
            {"from_port": {"block_id": "sma-fast", "port": "output"}, "to_port": {"block_id": "crossover-exit", "port": "fast"}},
            {"from_port": {"block_id": "sma-slow", "port": "output"}, "to_port": {"block_id": "crossover-exit", "port": "slow"}},
            {"from_port": {"block_id": "crossover-exit", "port": "output"}, "to_port": {"block_id": "exit-1", "port": "signal"}},
        ],
        "meta": {},
    },
    "Bollinger Breakout": {
        "blocks": [
            {
                "id": "price-1",
                "type": "price",
                "label": "Close Price",
                "position": {"x": 100, "y": 200},
                "params": {"source": "close"},
            },
            {
                "id": "bollinger-1",
                "type": "bollinger",
                "label": "Bollinger Bands (20, 2.0)",
                "position": {"x": 100, "y": 350},
                "params": {"period": 20, "std_dev": 2.0, "source": "close"},
            },
            {
                "id": "compare-entry",
                "type": "compare",
                "label": "Price > Upper",
                "position": {"x": 300, "y": 150},
                "params": {"operator": ">"},
            },
            {
                "id": "entry-1",
                "type": "entry_signal",
                "label": "Entry Signal",
                "position": {"x": 500, "y": 150},
                "params": {},
            },
            {
                "id": "compare-exit",
                "type": "compare",
                "label": "Price < Middle",
                "position": {"x": 300, "y": 350},
                "params": {"operator": "<"},
            },
            {
                "id": "exit-1",
                "type": "exit_signal",
                "label": "Exit Signal",
                "position": {"x": 500, "y": 350},
                "params": {},
            },
        ],
        "connections": [
            {"from_port": {"block_id": "price-1", "port": "output"}, "to_port": {"block_id": "compare-entry", "port": "left"}},
            {"from_port": {"block_id": "bollinger-1", "port": "upper"}, "to_port": {"block_id": "compare-entry", "port": "right"}},
            {"from_port": {"block_id": "compare-entry", "port": "output"}, "to_port": {"block_id": "entry-1", "port": "signal"}},
            {"from_port": {"block_id": "price-1", "port": "output"}, "to_port": {"block_id": "compare-exit", "port": "left"}},
            {"from_port": {"block_id": "bollinger-1", "port": "middle"}, "to_port": {"block_id": "compare-exit", "port": "right"}},
            {"from_port": {"block_id": "compare-exit", "port": "output"}, "to_port": {"block_id": "exit-1", "port": "signal"}},
        ],
        "meta": {},
    },
}


def upgrade() -> None:
    conn = op.get_bind()
    for name, definition in FIXED_DEFINITIONS.items():
        conn.execute(
            sa.text(
                "UPDATE strategy_templates SET definition_json = :def, updated_at = NOW() WHERE name = :name"
            ),
            {"def": json.dumps(definition), "name": name},
        )


def downgrade() -> None:
    # No automated downgrade — old definitions had broken connections
    pass
