"""Shared pre-validated strategy types for the backtest layer."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class TakeProfitLevel:
    """A single take-profit level."""

    profit_pct: float
    close_pct: int


@dataclass(frozen=True)
class RiskParams:
    """Extracted risk parameters with block-absent baselines."""

    position_size_pct: float = 100.0
    take_profit_levels: Optional[tuple[TakeProfitLevel, ...]] = None
    stop_loss_pct: Optional[float] = None
    max_drawdown_pct: Optional[float] = None
    time_exit_bars: Optional[int] = None
    trailing_stop_pct: Optional[float] = None


@dataclass(frozen=True)
class ValidatedStrategy:
    """Normalized strategy definition produced after a clean validation pass."""

    blocks: tuple[dict, ...]
    connections: tuple[dict, ...]
    risk_params: RiskParams


@dataclass(frozen=True)
class ValidationResult:
    """Outcome of validate_strategy: errors and an optional validated strategy."""

    errors: tuple
    strategy: Optional[ValidatedStrategy] = None
