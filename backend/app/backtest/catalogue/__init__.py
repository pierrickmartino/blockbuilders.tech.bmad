"""Block catalogue — registry of all catalogue-managed block handlers.

Discovery is via explicit imports (not autodiscovery).
"""
from __future__ import annotations

from app.backtest.catalogue.indicators.sma import SmaHandler
from app.backtest.catalogue.types import BlockHandler

CATALOGUE: dict[str, BlockHandler] = {
    "sma": SmaHandler(),
}


def lookup(block_type: str) -> BlockHandler | None:
    return CATALOGUE.get(block_type)
