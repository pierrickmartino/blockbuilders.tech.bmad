"""POST /backtests/coach — Tweak coaching (synchronous or async via Comparison runs)."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis
from rq import Queue
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.backtest.coaching import (
    RunInfo,
    build_coaching,
    diff_strategy_versions,
    match_trades,
    resolve_comparability,
)
from app.backtest.position_manager import Trade
from app.backtest.storage import download_json
from app.core.config import settings
from app.core.database import get_session
from app.models.backtest_run import BacktestRun
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.schemas.coaching import CoachRequest, CoachResponse, TradeCoachingItem
from app.schemas.strategy import StrategyDefinitionValidate
from app.services.strategy_validation import validate_strategy

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backtests", tags=["backtests"])


def _parse_ts(raw: str) -> datetime:
    return datetime.fromisoformat(raw.replace("Z", "+00:00"))


def _raw_to_trade(t: dict) -> Trade:
    """Convert a stored trade dict to a Trade object for coaching."""
    entry_ts = _parse_ts(t["entry_time"])
    exit_ts = _parse_ts(t["exit_time"])
    peak_ts_raw = t.get("peak_ts") or t["exit_time"]
    trough_ts_raw = t.get("trough_ts") or t["entry_time"]
    return Trade(
        entry_time=entry_ts,
        entry_price=t.get("entry_price", 0.0),
        exit_time=exit_ts,
        exit_price=t.get("exit_price", 0.0),
        side=t.get("side", "long"),
        pnl=t.get("pnl", 0.0),
        pnl_pct=t.get("pnl_pct", 0.0),
        qty=t.get("qty", 0.0),
        sl_price_at_entry=t.get("sl_price_at_entry"),
        tp_price_at_entry=t.get("tp_price_at_entry"),
        exit_reason=t.get("exit_reason", "unknown"),
        mae_usd=t.get("mae_usd", 0.0),
        mae_pct=t.get("mae_pct", 0.0),
        mfe_usd=t.get("mfe_usd", 0.0),
        mfe_pct=t.get("mfe_pct", 0.0),
        initial_risk_usd=t.get("initial_risk_usd"),
        r_multiple=t.get("r_multiple"),
        peak_price=t.get("peak_price", 0.0),
        peak_ts=_parse_ts(peak_ts_raw),
        trough_price=t.get("trough_price", 0.0),
        trough_ts=_parse_ts(trough_ts_raw),
        duration_seconds=t.get("duration_seconds", 0),
        fee_cost_usd=t.get("fee_cost_usd", 0.0),
        slippage_cost_usd=t.get("slippage_cost_usd", 0.0),
        spread_cost_usd=t.get("spread_cost_usd", 0.0),
        total_cost_usd=t.get("total_cost_usd", 0.0),
        notional_usd=t.get("notional_usd", 0.0),
    )


def _load_run(
    run_id,
    user_id,
    session: Session,
    label: str,
) -> BacktestRun:
    run = session.exec(
        select(BacktestRun).where(
            BacktestRun.id == run_id,
            BacktestRun.user_id == user_id,
        )
    ).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Backtest run {label} not found or not owned by you.",
        )
    if run.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Backtest run {label} is not completed.",
        )
    return run


def _load_validated_strategy(version_id, session: Session, label: str):
    sv = session.exec(
        select(StrategyVersion).where(StrategyVersion.id == version_id)
    ).first()
    if not sv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Strategy version for run {label} not found.",
        )
    definition = StrategyDefinitionValidate.model_validate(sv.definition_json)
    result = validate_strategy(definition)
    if not result.strategy:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Strategy version for run {label} failed validation.",
        )
    return result.strategy


def _load_trades(run: BacktestRun) -> list[Trade]:
    if not run.trades_key:
        return []
    try:
        raw_list = download_json(run.trades_key)
        return [_raw_to_trade(t) for t in raw_list]
    except Exception:
        logger.warning("Failed to load trades for run %s", run.id)
        return []


def _enqueue_comparison_run(
    source_run: BacktestRun,
    intersection_from: datetime,
    intersection_to: datetime,
    session: Session,
    queue: Queue,
) -> BacktestRun:
    """Create and enqueue a Comparison run over the intersection window."""
    comparison_run = BacktestRun(
        user_id=source_run.user_id,
        strategy_id=source_run.strategy_id,
        strategy_version_id=source_run.strategy_version_id,
        status="pending",
        asset=source_run.asset,
        timeframe=source_run.timeframe,
        date_from=intersection_from,
        date_to=intersection_to,
        initial_balance=source_run.initial_balance,
        fee_rate=source_run.fee_rate,
        slippage_rate=source_run.slippage_rate,
        spread_rate=source_run.spread_rate,
        triggered_by="comparison",
    )
    session.add(comparison_run)
    session.commit()
    session.refresh(comparison_run)
    queue.enqueue(
        "app.worker.jobs.run_backtest_job",
        str(comparison_run.id),
        job_timeout=300,
    )
    return comparison_run


@router.post("/coach", response_model=CoachResponse)
def coach_backtests(
    data: CoachRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> CoachResponse:
    """Return Tweak coaching for a run pair.

    Synchronous when windows are aligned; async (pending) when windows differ —
    enqueues two Comparison runs over the intersection and returns their IDs for
    polling via the existing backtest-status poller before re-calling.
    """
    run_a = _load_run(data.run_id_a, user.id, session, "A")
    run_b = _load_run(data.run_id_b, user.id, session, "B")

    info_a = RunInfo(
        strategy_id=run_a.strategy_id,
        strategy_version_id=run_a.strategy_version_id,
        asset=run_a.asset,
        timeframe=run_a.timeframe,
        fee_rate=run_a.fee_rate,
        slippage_rate=run_a.slippage_rate,
        spread_rate=run_a.spread_rate,
        date_from=run_a.date_from,
        date_to=run_a.date_to,
    )
    info_b = RunInfo(
        strategy_id=run_b.strategy_id,
        strategy_version_id=run_b.strategy_version_id,
        asset=run_b.asset,
        timeframe=run_b.timeframe,
        fee_rate=run_b.fee_rate,
        slippage_rate=run_b.slippage_rate,
        spread_rate=run_b.spread_rate,
        date_from=run_b.date_from,
        date_to=run_b.date_to,
    )

    compat = resolve_comparability(info_a, info_b)
    if not compat.eligible:
        return CoachResponse(eligible=False, reason=compat.reason)

    if compat.needs_rerun:
        try:
            redis_conn = Redis.from_url(settings.redis_url)
            queue = Queue("default", connection=redis_conn)
            cr_a = _enqueue_comparison_run(
                run_a, compat.intersection_from, compat.intersection_to, session, queue
            )
            cr_b = _enqueue_comparison_run(
                run_b, compat.intersection_from, compat.intersection_to, session, queue
            )
        except Exception:
            logger.exception("Failed to enqueue comparison runs")
            return CoachResponse(eligible=False, reason="failed_comparison")
        return CoachResponse(
            eligible=True,
            reason=compat.reason,
            status="pending",
            comparison_run_ids=[cr_a.id, cr_b.id],
        )

    va = _load_validated_strategy(run_a.strategy_version_id, session, "A")
    vb = _load_validated_strategy(run_b.strategy_version_id, session, "B")

    diff = diff_strategy_versions(va, vb)
    if diff.tier not in ("causal", "descriptive"):
        return CoachResponse(eligible=False, reason=f"tier_{diff.tier}")

    trades_a = _load_trades(run_a)
    trades_b = _load_trades(run_b)

    matched = match_trades(trades_a, trades_b)

    ret_a = run_a.total_return or 0.0
    ret_b = run_b.total_return or 0.0

    coaching = build_coaching(diff, matched, ret_a, ret_b)

    return CoachResponse(
        eligible=True,
        reason=compat.reason,
        status="ready",
        tier=coaching.tier,
        headline=coaching.headline,
        net_delta_pct=coaching.net_delta_pct,
        a_only_count=coaching.a_only_count,
        b_only_count=coaching.b_only_count,
        insights=[
            TradeCoachingItem(
                entry_time=i.entry_time,
                insight_type=i.insight_type,
                exit_reason_a=i.exit_reason_a,
                pnl_a=i.pnl_a,
                pnl_pct_a=i.pnl_pct_a,
                exit_reason_b=i.exit_reason_b,
                pnl_b=i.pnl_b,
                pnl_pct_b=i.pnl_pct_b,
            )
            for i in coaching.insights
        ],
    )
