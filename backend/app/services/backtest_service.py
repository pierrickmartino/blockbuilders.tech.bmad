"""Backtest business-logic extracted from the API handler."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from enum import Enum
from uuid import UUID

from sqlmodel import Session, select, func

from app.core.config import settings
from app.core.plans import get_effective_limits
from app.models.backtest_run import BacktestRun
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.services.exceptions import DailyLimitReached, HistoryDepthExceeded, StrategyHasNoVersions

logger = logging.getLogger(__name__)


class LimitState(str, Enum):
    OK = "ok"
    OVER_USING_CREDIT = "over_using_credit"
    OVER_NO_CREDIT = "over_no_credit"


@dataclass(frozen=True)
class JobSpec:
    run_id: str
    force_refresh_prices: bool
    correlation_id: str | None


def _today_start() -> datetime:
    return datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)


def _count_today_backtests(user: User, session: Session) -> int:
    return session.exec(
        select(func.count(BacktestRun.id)).where(
            BacktestRun.user_id == user.id,
            BacktestRun.created_at >= _today_start(),
        )
    ).one()


def check_daily_limit(user: User, session: Session, projected_count: int = 0) -> LimitState:
    """Return the user's current daily-limit state without raising."""
    effective_limits = get_effective_limits(user.plan_tier, user.user_tier)
    today_count = _count_today_backtests(user, session)
    if today_count + projected_count < effective_limits["max_backtests_per_day"]:
        return LimitState.OK
    if user.backtest_credit_balance > 0:
        return LimitState.OVER_USING_CREDIT
    return LimitState.OVER_NO_CREDIT


def enforce_daily_limit(user: User, session: Session) -> bool:
    """Return True if a credit must be consumed, False if within the free limit.

    Raises DailyLimitReached when over limit with no credits. The
    usage_limit_reached notification is committed before raising so it
    outlives the failed request.
    """
    effective_limits = get_effective_limits(user.plan_tier, user.user_tier)
    today_count = _count_today_backtests(user, session)
    today_start = _today_start()

    if today_count < effective_limits["max_backtests_per_day"]:
        return False

    if user.backtest_credit_balance > 0:
        return True

    # Over limit, no credits — persist notification before raising.
    existing = session.exec(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.type == "usage_limit_reached",
            Notification.is_read == False,  # noqa: E712
            Notification.created_at >= today_start,
        )
    ).first()
    if not existing:
        session.add(
            Notification(
                user_id=user.id,
                type="usage_limit_reached",
                title="Daily backtest limit reached",
                body=(
                    f"You've reached your daily limit of "
                    f"{effective_limits['max_backtests_per_day']} backtests. "
                    "Purchase backtest credits or upgrade your plan."
                ),
            )
        )
        session.commit()

    tomorrow = today_start + timedelta(days=1)
    raise DailyLimitReached(limit=effective_limits["max_backtests_per_day"], reset_time=tomorrow)


def enforce_history_depth(user: User, date_from: datetime, date_to: datetime) -> None:
    """Raise HistoryDepthExceeded if the date range exceeds the user's plan limit."""
    effective_limits = get_effective_limits(user.plan_tier, user.user_tier)
    if (date_to - date_from).days > effective_limits["max_history_days"]:
        raise HistoryDepthExceeded(limit_days=effective_limits["max_history_days"])


def latest_version(strategy: Strategy, session: Session) -> StrategyVersion:
    """Return the latest StrategyVersion, or raise StrategyHasNoVersions."""
    version = session.exec(
        select(StrategyVersion)
        .where(StrategyVersion.strategy_id == strategy.id)
        .order_by(StrategyVersion.version_number.desc())
    ).first()
    if not version:
        raise StrategyHasNoVersions()
    return version


def resolve_rates(
    user: User,
    fee_rate: float | None,
    slippage_rate: float | None,
    spread_rate: float | None,
) -> tuple[float, float, float]:
    """Resolve rates from request value → user default → global default."""
    resolved_fee = fee_rate if fee_rate is not None else (
        user.default_fee_percent if user.default_fee_percent is not None else settings.default_fee_rate
    )
    resolved_slippage = slippage_rate if slippage_rate is not None else (
        user.default_slippage_percent if user.default_slippage_percent is not None else settings.default_slippage_rate
    )
    resolved_spread = spread_rate if spread_rate is not None else (
        user.default_spread_percent if user.default_spread_percent is not None else settings.default_spread_rate
    )
    return resolved_fee, resolved_slippage, resolved_spread


def build_run(
    user: User,
    strategy: Strategy,
    version: StrategyVersion,
    session: Session,
    date_from: datetime,
    date_to: datetime,
    fee_rate: float,
    slippage_rate: float,
    spread_rate: float,
    correlation_id: str | None,
    *,
    force_refresh_prices: bool = False,
    batch_id: UUID | None = None,
    period_key: str | None = None,
) -> tuple[BacktestRun, JobSpec]:
    """Flush a new BacktestRun and return a JobSpec. Does NOT commit. Does NOT enqueue."""
    run = BacktestRun(
        user_id=user.id,
        strategy_id=strategy.id,
        strategy_version_id=version.id,
        status="pending",
        asset=strategy.asset,
        timeframe=strategy.timeframe,
        date_from=date_from,
        date_to=date_to,
        initial_balance=settings.default_initial_balance,
        fee_rate=fee_rate,
        slippage_rate=slippage_rate,
        spread_rate=spread_rate,
        batch_id=batch_id,
        period_key=period_key,
    )
    session.add(run)
    session.flush()

    return run, JobSpec(
        run_id=str(run.id),
        force_refresh_prices=force_refresh_prices,
        correlation_id=correlation_id,
    )
