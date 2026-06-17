"""RQ job functions for backtest processing."""
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import httpx
import resend
import structlog
from redis import Redis
from rq import Queue
from sqlmodel import Session, select, func

from app.core.config import settings
from app.core.database import engine
from app.core.logging import correlation_id_var
from app.models.backtest_run import BacktestRun
from app.models.candle import Candle
from app.models.data_quality_metric import DataQualityMetric
from app.models.alert_rule import AlertRule
from app.models.notification import Notification
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.backtest.candles import fetch_candles
from app.backtest.data_quality import compute_daily_metrics, check_has_issues
from app.backtest.interpreter import interpret_strategy
from app.backtest.engine import run_backtest, compute_benchmark_curve, compute_benchmark_metrics
from app.backtest.storage import upload_json, generate_results_key
from app.backtest.errors import BacktestError, StrategyInvalidError
from app.schemas.strategy import StrategyDefinitionValidate
from app.services.alert_evaluator import evaluate_alerts_for_run
from app.services.candle_boundary import last_closed_1d_candle_ts, last_closed_candle_ts
from app.services.performance_alert_decision import (
    decide_entry_alert,
    decide_exit_alert,
    decide_drawdown_alert,
)
from app.services.webhook_payload import build_drawdown_payload, build_entry_payload, build_exit_payload
from app.services.spot_price_cache import SpotPriceCache
from app.services.analytics import track_backend_event, flush_backend_events
from app.services.strategy_validation import validate_strategy
from app.models.alert_rule import AlertType

logger = logging.getLogger(__name__)


def _as_utc_datetime(value: datetime | None) -> datetime | None:
    """Normalize database datetimes to UTC-aware values before comparison."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def run_backtest_job(
    run_id: str,
    force_refresh_prices: bool = False,
    correlation_id: str | None = None,
) -> None:
    """
    Main job function for processing a backtest run.

    1. Load run, set status=running
    2. Load strategy definition
    3. Fetch candles
    4. Interpret strategy -> signals
    5. Run backtest engine
    6. Upload results to S3
    7. Update run with summary, set status=completed

    On error: set status=failed with error_message
    """
    run_uuid = UUID(run_id)
    cid_token = None

    try:
        with Session(engine) as session:
            # Load run
            run = session.exec(
                select(BacktestRun).where(BacktestRun.id == run_uuid)
            ).first()

            if not run:
                logger.error("backtest_run_not_found", extra={"run_id": run_id})
                return

            # Prefer the originating request correlation ID when available.
            job_correlation_id = correlation_id or str(run.id)
            cid_token = correlation_id_var.set(job_correlation_id)
            structlog.contextvars.bind_contextvars(
                user_id=str(run.user_id),
                strategy_id=str(run.strategy_id),
                run_id=run_id,
            )

            # Check idempotency - only process pending runs
            if run.status != "pending":
                logger.info("backtest_skipped", extra={"status": run.status})
                return

            # Set status to running
            run.status = "running"
            run.started_at = datetime.now(timezone.utc)
            run.updated_at = run.started_at
            session.add(run)
            session.commit()

            # Honor the user's server-side analytics consent: suppress backend
            # events only when the user has explicitly *declined* (an undecided
            # NULL choice still emits, preserving prior behavior).
            event_user = session.get(User, run.user_id)
            consent_declined = (
                event_user is not None and event_user.analytics_consent is False
            )

            started_at = time.monotonic()
            track_backend_event(
                "backtest_job_started",
                user_id=run.user_id,
                strategy_id=run.strategy_id,
                correlation_id=run.id,
                consent_declined=consent_declined,
            )
            logger.info("backtest_started")

            try:
                # Load strategy definition
                version = session.exec(
                    select(StrategyVersion).where(
                        StrategyVersion.id == run.strategy_version_id
                    )
                ).first()

                if not version:
                    raise BacktestError(
                        "Strategy version not found",
                        "Invalid strategy configuration.",
                    )

                definition = version.definition_json
                if not definition:
                    raise BacktestError(
                        "Strategy definition is empty",
                        "Invalid strategy: no block configuration found.",
                    )

                # Validate before fetching candles (pure CPU — no I/O cost)
                try:
                    parsed = StrategyDefinitionValidate.model_validate(definition)
                except Exception:
                    raise StrategyInvalidError(
                        "Strategy definition structure is malformed",
                        "Strategy validation failed: definition structure is malformed.",
                    )

                validation_result = validate_strategy(parsed)
                if validation_result.errors:
                    first = validation_result.errors[0]
                    extra = len(validation_result.errors) - 1
                    user_msg = (
                        f"{first.user_message} (+{extra} more issues)"
                        if extra > 0
                        else first.user_message
                    )
                    raise StrategyInvalidError(
                        f"Strategy validation failed: {first.message}",
                        user_msg,
                    )

                validated_strategy = validation_result.strategy

                logger.info(
                    "backtest_processing",
                    extra={
                        "asset": run.asset,
                        "timeframe": run.timeframe,
                        "date_from": str(run.date_from),
                        "date_to": str(run.date_to),
                    },
                )

                # Fetch candles
                candles = fetch_candles(
                    asset=run.asset,
                    timeframe=run.timeframe,
                    date_from=run.date_from,
                    date_to=run.date_to,
                    session=session,
                    force_refresh=force_refresh_prices,
                )

                if not candles:
                    raise BacktestError(
                        "No candles found for the specified period",
                        "No price data available for the selected date range.",
                    )

                if any(c.source != "cryptocompare" for c in candles):
                    run.used_backup_data = True
                    session.add(run)

                logger.info(
                    "candles_fetched",
                    extra={"count": len(candles), "used_backup_data": run.used_backup_data},
                )

                # Interpret strategy to get signals
                signals = interpret_strategy(validated_strategy, candles)
                logger.info(
                    "strategy_interpreted",
                    extra={
                        "entry_signals": sum(signals.entry_long),
                        "exit_signals": sum(signals.exit_long),
                    },
                )

                # Run backtest engine
                result = run_backtest(
                    candles=candles,
                    signals=signals,
                    initial_balance=run.initial_balance,
                    fee_rate=run.fee_rate,
                    slippage_rate=run.slippage_rate,
                    spread_rate=run.spread_rate,
                    timeframe=run.timeframe,
                )

                logger.info(
                    "backtest_engine_complete",
                    extra={
                        "num_trades": result.num_trades,
                        "total_return_pct": result.total_return_pct,
                    },
                )

                # Upload results to S3
                equity_curve_key = generate_results_key(run.id, "equity_curve.json")
                upload_json(equity_curve_key, result.equity_curve)

                # Compute benchmark equity curve
                benchmark_equity = compute_benchmark_curve(candles, run.initial_balance)
                logger.info("benchmark_computed", extra={"points": len(benchmark_equity)})

                # Calculate benchmark metrics
                benchmark_return_pct, alpha, beta = compute_benchmark_metrics(
                    result.equity_curve,
                    benchmark_equity,
                    run.initial_balance
                )
                logger.info(
                    "benchmark_metrics",
                    extra={"return_pct": benchmark_return_pct, "alpha": alpha, "beta": beta},
                )

                # Upload benchmark equity curve
                benchmark_curve_key = generate_results_key(run.id, "benchmark_equity_curve.json")
                upload_json(benchmark_curve_key, benchmark_equity)

                trades_data = []
                for t in result.trades:
                    entry_time = t.entry_time.isoformat()
                    trades_data.append(
                        {
                            "entry_time": entry_time,
                            "entry_price": t.entry_price,
                            "exit_time": t.exit_time.isoformat(),
                            "exit_price": t.exit_price,
                            "side": t.side,
                            "pnl": t.pnl,
                            "pnl_pct": t.pnl_pct,
                            "qty": t.qty,
                            "sl_price_at_entry": t.sl_price_at_entry,
                            "tp_price_at_entry": t.tp_price_at_entry,
                            "exit_reason": t.exit_reason,
                            "mae_usd": t.mae_usd,
                            "mae_pct": t.mae_pct,
                            "mfe_usd": t.mfe_usd,
                            "mfe_pct": t.mfe_pct,
                            "initial_risk_usd": t.initial_risk_usd,
                            "r_multiple": t.r_multiple,
                            "peak_price": t.peak_price,
                            "peak_ts": t.peak_ts.isoformat() if t.peak_ts else entry_time,
                            "trough_price": t.trough_price,
                            "trough_ts": t.trough_ts.isoformat() if t.trough_ts else entry_time,
                            "duration_seconds": t.duration_seconds,
                            "fee_cost_usd": t.fee_cost_usd,
                            "slippage_cost_usd": t.slippage_cost_usd,
                            "spread_cost_usd": t.spread_cost_usd,
                            "total_cost_usd": t.total_cost_usd,
                            "notional_usd": t.notional_usd,
                        }
                    )
                trades_key = generate_results_key(run.id, "trades.json")
                upload_json(trades_key, trades_data)

                # Update run with results
                run.status = "completed"
                run.total_return = result.total_return_pct
                run.cagr = result.cagr_pct
                run.max_drawdown = result.max_drawdown_pct
                run.num_trades = result.num_trades
                run.win_rate = result.win_rate_pct
                run.benchmark_return = benchmark_return_pct
                run.alpha = alpha
                run.beta = beta
                run.sharpe_ratio = result.sharpe_ratio
                run.sortino_ratio = result.sortino_ratio
                run.calmar_ratio = result.calmar_ratio
                run.max_consecutive_losses = result.max_consecutive_losses
                run.gross_return_usd = result.gross_return_usd
                run.gross_return_pct = result.gross_return_pct
                run.total_fees_usd = result.total_fees_usd
                run.total_slippage_usd = result.total_slippage_usd
                run.total_spread_usd = result.total_spread_usd
                run.total_costs_usd = result.total_costs_usd
                run.cost_pct_gross_return = result.cost_pct_gross_return
                run.avg_cost_per_trade_usd = result.avg_cost_per_trade_usd
                run.equity_curve_key = equity_curve_key
                run.benchmark_equity_curve_key = benchmark_curve_key
                run.trades_key = trades_key
                run.updated_at = datetime.now(timezone.utc)
                session.add(run)

                # Create notification for backtest completion
                notification = Notification(
                    user_id=run.user_id,
                    type="backtest_completed",
                    title="Backtest completed",
                    body=f"{run.asset}/{run.timeframe} backtest finished.",
                    link_url=f"/strategies/{run.strategy_id}/backtest?run={run.id}",
                )
                session.add(notification)

                # If this was an auto-run, update the strategy's last_auto_run_at
                if run.triggered_by == "auto":
                    strategy = session.exec(
                        select(Strategy).where(Strategy.id == run.strategy_id)
                    ).first()
                    if strategy:
                        strategy.last_auto_run_at = datetime.now(timezone.utc)
                        session.add(strategy)

                    # Evaluate old-style performance alerts (no version pin)
                    evaluate_alerts_for_run(run, session)

                # If this was an alert-dispatched run, evaluate all pinned-version conditions
                if run.triggered_by == "alert":
                    _evaluate_pinned_alert(run, session)

                # Mark user as onboarded on first completed backtest
                onboarding_user = session.get(User, run.user_id)
                if onboarding_user and not onboarding_user.has_completed_onboarding:
                    onboarding_user.has_completed_onboarding = True
                    session.add(onboarding_user)

                session.commit()

                duration_ms = int((time.monotonic() - started_at) * 1000)
                track_backend_event(
                    "backtest_job_completed",
                    user_id=run.user_id,
                    strategy_id=run.strategy_id,
                    correlation_id=run.id,
                    duration_ms=duration_ms,
                    consent_declined=consent_declined,
                )

                logger.info("backtest_completed")

            except BacktestError as e:
                logger.error("backtest_error", extra={"error": e.message})
                run.status = "failed"
                run.error_message = e.user_message
                run.updated_at = datetime.now(timezone.utc)
                session.add(run)
                session.commit()

                duration_ms = int((time.monotonic() - started_at) * 1000)
                track_backend_event(
                    "backtest_job_failed",
                    user_id=run.user_id,
                    strategy_id=run.strategy_id,
                    correlation_id=run.id,
                    duration_ms=duration_ms,
                    consent_declined=consent_declined,
                )

            except Exception:
                logger.exception("backtest_unexpected_error")
                run.status = "failed"
                run.error_message = "An unexpected error occurred during backtest processing."
                run.updated_at = datetime.now(timezone.utc)
                session.add(run)
                session.commit()

                duration_ms = int((time.monotonic() - started_at) * 1000)
                track_backend_event(
                    "backtest_job_failed",
                    user_id=run.user_id,
                    strategy_id=run.strategy_id,
                    correlation_id=run.id,
                    duration_ms=duration_ms,
                    consent_declined=consent_declined,
                )
    finally:
        # Clean up bound context to prevent leaking across jobs
        structlog.contextvars.unbind_contextvars(
            "user_id", "strategy_id", "run_id",
        )
        if cid_token is not None:
            correlation_id_var.reset(cid_token)
        # RQ workhorse processes are short-lived; drain the async PostHog queue
        # before this job process exits to avoid dropping terminal lifecycle events.
        flush_backend_events(shutdown=True)


def _evaluate_pinned_alert(run: BacktestRun, session: Session) -> None:
    """Post-completion hook for triggered_by='alert' runs.

    Evaluates entry, exit, and drawdown crossing conditions against the alert's
    pinned version. Reads the watermark once before any condition updates it so
    entry and exit are always checked against the same baseline candle boundary.
    Creates one combined in-app notification if any condition fired.
    """
    from app.backtest.storage import download_json as _download_json

    rule = session.exec(
        select(AlertRule).where(
            AlertRule.strategy_id == run.strategy_id,
            AlertRule.alert_type == AlertType.PERFORMANCE,
            AlertRule.is_active == True,  # noqa: E712
        )
    ).first()
    if not rule or rule.strategy_version_id is None:
        return

    # Snapshot watermark and drawdown state before any mutation
    watermark = _as_utc_datetime(rule.last_fired_candle_ts)
    last_drawdown_pct = rule.last_drawdown_pct

    trades: list[dict] = []
    if run.trades_key and (rule.alert_on_entry or rule.alert_on_exit):
        try:
            trades = _download_json(run.trades_key) or []
        except Exception as exc:
            logger.warning("alert_trades_fetch_failed", extra={"error": str(exc)})

    equity_curve: list[dict] = []
    if run.equity_curve_key and rule.threshold_pct is not None:
        try:
            equity_curve = _download_json(run.equity_curve_key) or []
        except Exception as exc:
            logger.warning("alert_equity_fetch_failed", extra={"error": str(exc)})

    reasons: list[str] = []
    fired_entry_events: list[Any] = []
    fired_exit_events: list[Any] = []
    drawdown_fired = False
    drawdown_pct = 0.0

    if rule.alert_on_entry:
        entry_result = decide_entry_alert(trades, watermark, run.date_to, run.timeframe)
        if entry_result.fired_events:
            fired_entry_events = entry_result.fired_events
            reasons.append(
                f"entered a position on {entry_result.fired_events[0].entry_time.date()}"
            )

    if rule.alert_on_exit:
        exit_result = decide_exit_alert(trades, watermark, run.date_to, run.timeframe)
        if exit_result.fired_events:
            fired_exit_events = exit_result.fired_events
            ev = exit_result.fired_events[0]
            reason_label = _format_exit_reason(ev.exit_reason)
            reasons.append(f"exited a position on {ev.exit_time.date()} ({reason_label})")

    new_drawdown_pct = last_drawdown_pct
    if rule.threshold_pct is not None:
        dd_result = decide_drawdown_alert(equity_curve, rule.threshold_pct, last_drawdown_pct)
        new_drawdown_pct = dd_result.current_drawdown_pct
        drawdown_pct = dd_result.current_drawdown_pct
        if dd_result.fired:
            drawdown_fired = True
            reasons.append(
                f"drawdown {dd_result.current_drawdown_pct:.1f}% crossed threshold"
                f" {rule.threshold_pct}%"
            )

    if reasons:
        strategy = session.exec(
            select(Strategy).where(Strategy.id == run.strategy_id)
        ).first()
        strategy_name = strategy.name if strategy else str(run.strategy_id)
        reasons_text = "; ".join(reasons)

        notification = Notification(
            user_id=run.user_id,
            type="performance_alert",
            title="Performance alert triggered",
            body=f'"{strategy_name}" {reasons_text}.',
            link_url=f"/strategies/{run.strategy_id}/backtest?run={run.id}",
        )
        session.add(notification)

        if rule.notify_email and settings.resend_api_key:
            try:
                user = session.get(User, run.user_id)
                if user and user.email:
                    strategy_url = (
                        f"{settings.frontend_url}/strategies/{run.strategy_id}"
                        f"/backtest?run={run.id}"
                    )
                    resend.api_key = settings.resend_api_key
                    resend.Emails.send({
                        "from": "Blockbuilders <noreply@blockbuilders.tech>",
                        "to": [user.email],
                        "subject": f"Performance alert triggered — {strategy_name}",
                        "html": (
                            f"<p>Your strategy <strong>{strategy_name}</strong>:</p>"
                            f"<ul>{''.join(f'<li>{r}</li>' for r in reasons)}</ul>"
                            f'<p><a href="{strategy_url}">View backtest results</a></p>'
                        ),
                    })
            except Exception as exc:
                logger.error("alert_email_failed", extra={"error": str(exc)})

        if rule.notify_webhook and rule.webhook_url:
            result_url = (
                f"{settings.frontend_url}/strategies/{run.strategy_id}/backtest?run={run.id}"
            )
            _common = dict(
                strategy_name=strategy_name,
                strategy_version_id=str(rule.strategy_version_id),
                asset=run.asset or "",
                timeframe=run.timeframe or "",
                result_url=result_url,
            )
            # Collect (candle_ts, payload) for all fired events, sort chronologically
            webhook_events: list[tuple[datetime, dict]] = []
            for ev in fired_entry_events:
                webhook_events.append((
                    ev.entry_time,
                    build_entry_payload(candle_ts=ev.entry_time, **_common),
                ))
            for ev in fired_exit_events:
                webhook_events.append((
                    ev.exit_time,
                    build_exit_payload(candle_ts=ev.exit_time, exit_reason=ev.exit_reason, **_common),
                ))
            if drawdown_fired:
                run_date_to_utc = _as_utc_datetime(run.date_to) or datetime.now(timezone.utc)
                webhook_events.append((
                    run_date_to_utc,
                    build_drawdown_payload(candle_ts=run_date_to_utc, drawdown_pct=drawdown_pct, **_common),
                ))
            webhook_events.sort(key=lambda t: t[0])
            for _, payload in webhook_events:
                post_webhook(rule.webhook_url, payload)

    # Always advance watermark and update drawdown state
    new_watermark = _utc_now_for_watermark(run.date_to)
    rule.last_fired_candle_ts = new_watermark
    rule.last_drawdown_pct = new_drawdown_pct
    rule.updated_at = datetime.now(timezone.utc)
    session.add(rule)
    logger.info(
        "pinned_alert_evaluated",
        extra={
            "rule_id": str(rule.id),
            "fired_count": len(reasons),
            "new_watermark": str(new_watermark.date()),
        },
    )


def _format_exit_reason(reason: Any) -> str:
    reason_map = {
        "signal": "signal",
        "tp": "take profit",
        "sl": "stop loss",
        "trailing_stop": "trailing stop",
        "time_exit": "time exit",
        "max_dd": "max drawdown",
    }
    if not isinstance(reason, str):
        return "unknown"
    return reason_map.get(reason, reason.replace("_", " "))


def _utc_now_for_watermark(run_date_to: datetime) -> datetime:
    if run_date_to.tzinfo is None:
        return run_date_to.replace(tzinfo=timezone.utc)
    return run_date_to.astimezone(timezone.utc)


def evaluate_performance_alerts_daily() -> None:
    """Daily dispatcher: enqueue pinned-version re-backtests for active performance alerts.

    Selects active performance alerts on 1d strategies with a pinned
    strategy_version_id whose latest daily candle has not yet been evaluated
    (i.e. last_fired_candle_ts < last_closed_1d_candle_ts()), then enqueues
    a run tagged triggered_by='alert' using the pinned version. Independent of
    auto_update_enabled.
    """
    if not settings.scheduler_enabled:
        logger.info("Scheduler disabled, skipping evaluate_performance_alerts_daily")
        return

    logger.info("Starting evaluate_performance_alerts_daily")

    redis_conn = Redis.from_url(settings.redis_url)
    queue = Queue("default", connection=redis_conn)
    cutoff_ts = last_closed_1d_candle_ts()

    with Session(engine) as session:
        from sqlalchemy import or_

        alerts = session.exec(
            select(AlertRule)
            .join(Strategy, AlertRule.strategy_id == Strategy.id)
            .where(
                AlertRule.is_active == True,  # noqa: E712
                AlertRule.alert_type == AlertType.PERFORMANCE,
                AlertRule.strategy_version_id.isnot(None),
                Strategy.timeframe == "1d",
                or_(
                    AlertRule.alert_on_entry == True,  # noqa: E712
                    AlertRule.alert_on_exit == True,  # noqa: E712
                    AlertRule.threshold_pct.isnot(None),
                ),
            )
        ).all()

        enqueued = 0
        skipped = 0

        for alert in alerts:
            # Skip if this alert has already been evaluated for the latest closed candle
            watermark = _as_utc_datetime(alert.last_fired_candle_ts)
            if watermark is not None and watermark >= cutoff_ts:
                skipped += 1
                continue

            # Skip if there is already a pending/running alert-triggered run
            existing = session.exec(
                select(BacktestRun).where(
                    BacktestRun.strategy_id == alert.strategy_id,
                    BacktestRun.triggered_by == "alert",
                    BacktestRun.status.in_(["pending", "running"]),
                )
            ).first()
            if existing:
                skipped += 1
                continue

            user = session.get(User, alert.user_id)
            strategy = session.get(Strategy, alert.strategy_id)
            if not user or not strategy:
                continue

            now = datetime.now(timezone.utc)
            date_from = cutoff_ts - timedelta(days=strategy.auto_update_lookback_days)

            run = BacktestRun(
                user_id=alert.user_id,
                strategy_id=alert.strategy_id,
                strategy_version_id=alert.strategy_version_id,
                status="pending",
                asset=strategy.asset,
                timeframe=strategy.timeframe,
                date_from=date_from,
                date_to=cutoff_ts,
                initial_balance=settings.default_initial_balance,
                fee_rate=user.default_fee_percent or settings.default_fee_rate,
                slippage_rate=user.default_slippage_percent or settings.default_slippage_rate,
                triggered_by="alert",
            )
            session.add(run)
            session.commit()
            session.refresh(run)

            try:
                queue.enqueue(
                    "app.worker.jobs.run_backtest_job",
                    str(run.id),
                    job_timeout=300,
                )
                enqueued += 1
                logger.info(
                    "alert_backtest_enqueued",
                    extra={"alert_id": str(alert.id), "run_id": str(run.id)},
                )
            except Exception as exc:
                logger.error(
                    "alert_enqueue_failed",
                    extra={"alert_id": str(alert.id), "error": str(exc)},
                )
                run.status = "failed"
                run.error_message = "Failed to queue alert-triggered backtest"
                session.add(run)
                session.commit()

    logger.info(
        "evaluate_performance_alerts_daily completed",
        extra={"enqueued": enqueued, "skipped": skipped},
    )


def evaluate_performance_alerts_sub_daily(now: datetime | None = None) -> None:
    """Hourly dispatcher: enqueue pinned-version re-backtests for 1h and 4h alerts.

    Runs every hour (at :05 past each hour). Uses last_closed_candle_ts(timeframe)
    to determine the cutoff so 4h alerts are naturally skipped in 3 out of 4 runs
    (their watermark already covers the latest closed 4h candle). A single run
    whose date_to spans a multi-candle catch-up gap coalesces all triggers into one
    notification via the watermark-based decide_* functions.
    """
    if not settings.scheduler_enabled:
        logger.info("Scheduler disabled, skipping evaluate_performance_alerts_sub_daily")
        return

    logger.info("Starting evaluate_performance_alerts_sub_daily")

    if now is None:
        now = datetime.now(timezone.utc)

    redis_conn = Redis.from_url(settings.redis_url)
    queue = Queue("default", connection=redis_conn)

    with Session(engine) as session:
        from sqlalchemy import or_

        alerts = session.exec(
            select(AlertRule)
            .join(Strategy, AlertRule.strategy_id == Strategy.id)
            .where(
                AlertRule.is_active == True,  # noqa: E712
                AlertRule.alert_type == AlertType.PERFORMANCE,
                AlertRule.strategy_version_id.isnot(None),
                Strategy.timeframe.in_(["1h", "4h"]),
                or_(
                    AlertRule.alert_on_entry == True,  # noqa: E712
                    AlertRule.alert_on_exit == True,  # noqa: E712
                    AlertRule.threshold_pct.isnot(None),
                ),
            )
        ).all()

        enqueued = 0
        skipped = 0

        for alert in alerts:
            strategy = session.get(Strategy, alert.strategy_id)
            if not strategy:
                continue

            cutoff_ts = last_closed_candle_ts(strategy.timeframe, now)

            watermark = _as_utc_datetime(alert.last_fired_candle_ts)
            if watermark is not None and watermark >= cutoff_ts:
                skipped += 1
                continue

            existing = session.exec(
                select(BacktestRun).where(
                    BacktestRun.strategy_id == alert.strategy_id,
                    BacktestRun.triggered_by == "alert",
                    BacktestRun.status.in_(["pending", "running"]),
                )
            ).first()
            if existing:
                skipped += 1
                continue

            user = session.get(User, alert.user_id)
            if not user:
                continue

            date_from = cutoff_ts - timedelta(days=strategy.auto_update_lookback_days)

            run = BacktestRun(
                user_id=alert.user_id,
                strategy_id=alert.strategy_id,
                strategy_version_id=alert.strategy_version_id,
                status="pending",
                asset=strategy.asset,
                timeframe=strategy.timeframe,
                date_from=date_from,
                date_to=cutoff_ts,
                initial_balance=settings.default_initial_balance,
                fee_rate=user.default_fee_percent or settings.default_fee_rate,
                slippage_rate=user.default_slippage_percent or settings.default_slippage_rate,
                triggered_by="alert",
            )
            session.add(run)
            session.commit()
            session.refresh(run)

            try:
                queue.enqueue(
                    "app.worker.jobs.run_backtest_job",
                    str(run.id),
                    job_timeout=300,
                )
                enqueued += 1
                logger.info(
                    "alert_backtest_enqueued",
                    extra={"alert_id": str(alert.id), "run_id": str(run.id)},
                )
            except Exception as exc:
                logger.error(
                    "alert_enqueue_failed",
                    extra={"alert_id": str(alert.id), "error": str(exc)},
                )
                run.status = "failed"
                run.error_message = "Failed to queue alert-triggered backtest"
                session.add(run)
                session.commit()

    logger.info(
        "evaluate_performance_alerts_sub_daily completed",
        extra={"enqueued": enqueued, "skipped": skipped},
    )


def auto_update_strategies_daily() -> None:
    """
    Daily scheduler job: Find all auto-update enabled strategies
    and enqueue backtests for each.

    Algorithm:
    1. Query strategies WHERE auto_update_enabled = true
    2. For each strategy:
       - Count user's backtests today (check limits)
       - Check for existing pending/running auto-runs (idempotency)
       - If OK, create BacktestRun with triggered_by='auto'
       - Enqueue job
    """
    if not settings.scheduler_enabled:
        logger.info("Scheduler is disabled, skipping auto_update_strategies_daily")
        return

    logger.info("Starting auto_update_strategies_daily job")

    redis_conn = Redis.from_url(settings.redis_url)
    queue = Queue("default", connection=redis_conn)

    with Session(engine) as session:
        # Get all strategies with auto-update enabled
        strategies = session.exec(
            select(Strategy).where(Strategy.auto_update_enabled == True)  # noqa: E712
        ).all()

        logger.info(f"Found {len(strategies)} strategies with auto-update enabled")

        # Group strategies by user to check limits
        user_ids = {s.user_id for s in strategies}
        users = {
            u.id: u
            for u in session.exec(select(User).where(User.id.in_(user_ids))).all()
        }

        # Count today's backtests per user
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        user_backtest_counts: dict[str, int] = {}
        for user_id in user_ids:
            count = session.exec(
                select(func.count(BacktestRun.id)).where(
                    BacktestRun.user_id == user_id,
                    BacktestRun.created_at >= today_start,
                )
            ).one()
            user_backtest_counts[str(user_id)] = count

        enqueued = 0
        skipped_limit = 0
        skipped_existing = 0

        for strategy in strategies:
            user = users.get(strategy.user_id)
            if not user:
                logger.warning(f"User not found for strategy {strategy.id}")
                continue

            # Check daily limit
            user_id_str = str(strategy.user_id)
            current_count = user_backtest_counts.get(user_id_str, 0)
            if current_count >= user.max_backtests_per_day:
                logger.info(f"Skipping strategy {strategy.id}: user {user_id_str} at daily limit ({current_count}/{user.max_backtests_per_day})")
                skipped_limit += 1
                continue

            # Check for existing pending/running auto-runs (idempotency)
            existing_run = session.exec(
                select(BacktestRun).where(
                    BacktestRun.strategy_id == strategy.id,
                    BacktestRun.triggered_by == "auto",
                    BacktestRun.status.in_(["pending", "running"]),
                )
            ).first()

            if existing_run:
                logger.info(f"Skipping strategy {strategy.id}: existing auto-run in progress")
                skipped_existing += 1
                continue

            # Get latest version
            latest_version = session.exec(
                select(StrategyVersion)
                .where(StrategyVersion.strategy_id == strategy.id)
                .order_by(StrategyVersion.version_number.desc())
            ).first()

            if not latest_version:
                logger.warning(f"Skipping strategy {strategy.id}: no saved versions")
                continue

            # Calculate date range
            now = datetime.now(timezone.utc)
            date_to = now
            date_from = now - timedelta(days=strategy.auto_update_lookback_days)

            # Create backtest run
            run = BacktestRun(
                user_id=strategy.user_id,
                strategy_id=strategy.id,
                strategy_version_id=latest_version.id,
                status="pending",
                asset=strategy.asset,
                timeframe=strategy.timeframe,
                date_from=date_from,
                date_to=date_to,
                initial_balance=settings.default_initial_balance,
                fee_rate=user.default_fee_percent if user.default_fee_percent else settings.default_fee_rate,
                slippage_rate=user.default_slippage_percent if user.default_slippage_percent else settings.default_slippage_rate,
                triggered_by="auto",
            )
            session.add(run)
            session.commit()
            session.refresh(run)

            # Increment user count for next iteration
            user_backtest_counts[user_id_str] = current_count + 1

            # Enqueue job
            try:
                queue.enqueue(
                    "app.worker.jobs.run_backtest_job",
                    str(run.id),
                    job_timeout=300,
                )
                enqueued += 1
                logger.info(f"Enqueued auto-backtest for strategy {strategy.id}, run {run.id}")
            except Exception as e:
                logger.error(f"Failed to enqueue job for strategy {strategy.id}: {e}")
                run.status = "failed"
                run.error_message = "Failed to queue backtest job"
                session.add(run)
                session.commit()

    logger.info(f"auto_update_strategies_daily completed: {enqueued} enqueued, {skipped_limit} skipped (limit), {skipped_existing} skipped (existing)")


def validate_data_quality_daily() -> None:
    """
    Daily scheduler job: Compute data quality metrics for all asset/timeframe/day combinations.
    Processes the last N days (configurable via settings.data_quality_lookback_days).
    """
    if not settings.scheduler_enabled:
        logger.info("Scheduler is disabled, skipping validate_data_quality_daily")
        return

    logger.info("Starting validate_data_quality_daily job")

    with Session(engine) as session:
        # Get distinct asset/timeframe pairs from candles table
        stmt = select(Candle.asset, Candle.timeframe).distinct()
        asset_timeframe_pairs = session.exec(stmt).all()

        logger.info(f"Found {len(asset_timeframe_pairs)} asset/timeframe combinations")

        # Calculate date range (last N days)
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        lookback_days = settings.data_quality_lookback_days
        start_date = today - timedelta(days=lookback_days)

        processed = 0
        skipped = 0

        for asset, timeframe in asset_timeframe_pairs:
            # Compute global earliest/latest candle dates for this pair (once)
            range_stmt = (
                select(func.min(Candle.timestamp), func.max(Candle.timestamp))
                .where(Candle.asset == asset)
                .where(Candle.timeframe == timeframe)
            )
            range_result = session.exec(range_stmt).first()
            earliest_candle = range_result[0].date() if range_result and range_result[0] else None
            latest_candle = range_result[1].date() if range_result and range_result[1] else None

            # Process each day in the lookback window
            current_date = start_date
            while current_date <= today:
                # Check if metric already exists for this day (idempotency)
                existing_metric = session.exec(
                    select(DataQualityMetric).where(
                        DataQualityMetric.asset == asset,
                        DataQualityMetric.timeframe == timeframe,
                        DataQualityMetric.date == current_date,
                    )
                ).first()

                if existing_metric:
                    # Skip if metric was computed recently (within last hour)
                    created_at = existing_metric.created_at
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    else:
                        created_at = created_at.astimezone(timezone.utc)
                    if created_at > datetime.now(timezone.utc) - timedelta(hours=1):
                        skipped += 1
                        current_date += timedelta(days=1)
                        continue

                    # Delete old metric to replace with fresh computation
                    session.delete(existing_metric)

                # Compute metrics for this day
                try:
                    metrics = compute_daily_metrics(asset, timeframe, current_date, session)

                    # Check if metrics breach thresholds
                    has_issues = check_has_issues(
                        metrics["gap_percent"],
                        metrics["outlier_count"],
                        metrics["volume_consistency"],
                    )

                    # Create and store metric
                    quality_metric = DataQualityMetric(
                        asset=asset,
                        timeframe=timeframe,
                        date=current_date,
                        gap_percent=metrics["gap_percent"],
                        outlier_count=metrics["outlier_count"],
                        volume_consistency=metrics["volume_consistency"],
                        has_issues=has_issues,
                        earliest_candle_date=earliest_candle,
                        latest_candle_date=latest_candle,
                    )
                    session.add(quality_metric)
                    processed += 1

                except Exception as e:
                    logger.error(f"Error computing metrics for {asset}/{timeframe} on {current_date}: {e}")

                current_date += timedelta(days=1)

        # Commit all metrics
        session.commit()

    logger.info(f"validate_data_quality_daily completed: {processed} metrics computed, {skipped} skipped (recent)")


def evaluate_price_alerts() -> None:
    """
    Evaluate active price alerts against current market prices.

    Runs every 1-5 minutes (configured in scheduler).
    Only triggers when price crosses threshold since last check.
    """
    if not settings.scheduler_enabled:
        logger.info("Scheduler disabled, skipping evaluate_price_alerts")
        return

    logger.info("Starting evaluate_price_alerts job")

    with Session(engine) as session:
        from decimal import Decimal
        from app.models.alert_rule import AlertType, Direction

        now = datetime.now(timezone.utc)

        # Get active price alerts
        alerts = session.exec(
            select(AlertRule).where(
                AlertRule.alert_type == AlertType.PRICE,
                AlertRule.is_active == True  # noqa: E712
            ).with_for_update()  # Prevent race conditions
        ).all()

        if not alerts:
            logger.info("No active price alerts to evaluate")
            return

        logger.info(f"Found {len(alerts)} active price alerts")

        # Mark expired alerts as inactive
        expired_count = 0
        for alert in alerts:
            expires_at = _as_utc_datetime(alert.expires_at)
            if expires_at and expires_at <= now:
                alert.is_active = False
                session.add(alert)
                expired_count += 1

        if expired_count > 0:
            session.commit()
            logger.info(f"Marked {expired_count} alerts as expired")

        # Filter to non-expired alerts
        active_alerts = [a for a in alerts if a.is_active]

        if not active_alerts:
            logger.info("No non-expired alerts to evaluate")
            return

        # Read prices from shared spot cache (populated by refresh_spot_prices job)
        redis = Redis.from_url(settings.redis_url)
        cache = SpotPriceCache(redis)
        ticker = cache.read()
        if ticker is None:
            logger.warning("Spot price cache is empty, skipping price alert evaluation")
            return

        prices = {item.pair: Decimal(str(item.price)) for item in ticker.items}

        triggered_count = 0

        for alert in active_alerts:
            current_price = prices.get(alert.asset)
            if current_price is None:
                logger.warning(f"No price data for {alert.asset}, skipping alert {alert.id}")
                continue

            # Check crossing condition
            triggered = False
            last_price = alert.last_checked_price

            if alert.direction == Direction.ABOVE:
                # Trigger if price crossed threshold from below
                if last_price is not None and last_price < alert.threshold_price and current_price >= alert.threshold_price:
                    triggered = True
            elif alert.direction == Direction.BELOW:
                # Trigger if price crossed threshold from above
                if last_price is not None and last_price > alert.threshold_price and current_price <= alert.threshold_price:
                    triggered = True

            # Update last checked price (always, even if not triggered)
            alert.last_checked_price = current_price
            session.add(alert)

            if not triggered:
                continue

            # Alert triggered - create notifications
            triggered_count += 1
            direction_text = "above" if alert.direction == Direction.ABOVE else "below"
            body = f"{alert.asset} {direction_text} {alert.threshold_price}. Current: {current_price}."

            # In-app notification (always)
            notification = Notification(
                user_id=alert.user_id,
                type="price_alert",
                title="Price alert triggered",
                body=body,
                link_url="/alerts",
            )
            session.add(notification)

            # Email notification (if enabled)
            if alert.notify_email:
                _send_price_alert_email(alert, current_price, session)

            # Webhook notification (if enabled)
            if alert.notify_webhook and alert.webhook_url:
                _send_price_alert_webhook(alert, current_price)

            # Deactivate alert (one-shot)
            alert.is_active = False
            alert.last_triggered_at = now
            session.add(alert)

            logger.info(f"Price alert triggered: {alert.asset} {direction_text} {alert.threshold_price}")

        session.commit()
        logger.info(f"evaluate_price_alerts completed: {triggered_count} alerts triggered")


def _send_price_alert_email(alert: AlertRule, current_price: Any, session: Session) -> None:
    """Send email notification for triggered price alert."""
    if not settings.resend_api_key:
        logger.warning("resend_api_key not configured, skipping email")
        return

    try:
        from app.models.user import User
        from app.models.alert_rule import Direction

        user = session.exec(select(User).where(User.id == alert.user_id)).first()
        if not user or not user.email:
            logger.warning(f"User email not found for alert {alert.id}")
            return

        direction_text = "above" if alert.direction == Direction.ABOVE else "below"
        html_body = f"""
        <p>Your price alert for <strong>{alert.asset}</strong> has been triggered:</p>
        <ul>
            <li>Condition: {direction_text} {alert.threshold_price}</li>
            <li>Current price: {current_price}</li>
        </ul>
        <p><a href="{settings.frontend_url}/alerts">Manage your alerts</a></p>
        """

        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": "Blockbuilders <noreply@blockbuilders.tech>",
            "to": [user.email],
            "subject": f"Price alert triggered - {alert.asset}",
            "html": html_body,
        })
        logger.info(f"Price alert email sent to {user.email}")

    except Exception as e:
        logger.error(f"Failed to send price alert email: {e}")


def post_webhook(url: str, payload: dict) -> None:
    """POST a JSON payload to a webhook URL. Fire-and-forget: swallows all failures."""
    try:
        with httpx.Client(timeout=10.0, follow_redirects=False) as client:
            response = client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            logger.info(f"Webhook delivered to {url}")
    except Exception as e:
        logger.error(f"Webhook delivery failed to {url}: {e}")


def _send_price_alert_webhook(alert: AlertRule, current_price: Any) -> None:
    """Send webhook POST for triggered price alert."""
    payload = {
        "type": "price_alert",
        "asset": alert.asset,
        "direction": alert.direction.value,
        "threshold_price": float(alert.threshold_price),
        "current_price": float(current_price),
        "triggered_at": datetime.now(timezone.utc).isoformat(),
    }
    post_webhook(alert.webhook_url, payload)


def _has_active_price_alerts() -> bool:
    """Return True if at least one price alert is currently active."""
    from app.models.alert_rule import AlertType

    with Session(engine) as session:
        count = session.exec(
            select(func.count(AlertRule.id)).where(
                AlertRule.alert_type == AlertType.PRICE,
                AlertRule.is_active == True,  # noqa: E712
            )
        ).one()
    return count > 0


def _fetch_full_ticker_items() -> list[Any]:
    """Fetch price, 24h change, and 24h volume for all supported assets via PriceRouter.

    Returns a list of TickerItem objects containing only assets with a real,
    non-zero price. Missing or zero-priced assets are omitted (never written as
    placeholders) so the caller can preserve last-known-good values for them.
    Returns [] on any error.
    """
    from app.market_data import price_router
    from app.schemas.market import TickerItem
    from app.schemas.strategy import ALLOWED_ASSETS

    try:
        prices = price_router.get_spot_prices(ALLOWED_ASSETS)
        items = []
        for asset in ALLOWED_ASSETS:
            spot = prices.get(asset)
            if spot and spot.price > 0:
                items.append(TickerItem(
                    pair=asset,
                    price=float(spot.price),
                    change_24h_pct=spot.change_24h_pct,
                    volume_24h=spot.volume_24h,
                ))
            else:
                logger.warning("No ticker data for %s", asset)
        return items

    except Exception as exc:
        logger.error("Failed to fetch full ticker data: %s", exc)
        return []


def refresh_spot_prices() -> None:
    """Fetch all spot prices from CryptoCompare and write them to SpotPriceCache.

    Runs every 120 seconds. Skipped when there are no active price alerts AND
    the ticker endpoint has not been viewed in the last 240 seconds (gate).
    """
    if not settings.scheduler_enabled:
        logger.info("Scheduler disabled, skipping refresh_spot_prices")
        return

    from app.services.spot_price_cache import SpotPriceCache
    from app.schemas.market import TickerListResponse

    redis = Redis.from_url(settings.redis_url)
    cache = SpotPriceCache(redis)

    gate_open = _has_active_price_alerts() or cache.viewed_recently(window=240)
    if not gate_open:
        logger.info("refresh_spot_prices: gate closed (no active alerts, no recent view) — skipping")
        return

    logger.info("refresh_spot_prices: gate open — fetching prices")
    items = _fetch_full_ticker_items()

    if not items:
        logger.warning("refresh_spot_prices: no items fetched, preserving cached prices")
        return

    # Merge fresh prices over last-known-good: assets missing this cycle keep
    # their previously cached price rather than being dropped or zeroed.
    merged = _merge_with_cached(items, cache.read())

    cache.write(TickerListResponse(items=merged, as_of=datetime.now(timezone.utc)))
    logger.info(
        f"refresh_spot_prices: wrote {len(merged)} prices to cache "
        f"({len(items)} fresh this cycle)"
    )


def _merge_with_cached(fresh: list[Any], cached: Any) -> list[Any]:
    """Overlay freshly fetched ticker items on top of the cached snapshot.

    Fresh items win per pair; pairs absent this cycle retain their cached value
    (last-known-good). Ordering follows the cached snapshot, then any new pairs.
    """
    fresh_by_pair = {item.pair: item for item in fresh}
    if cached is None:
        return list(fresh)

    merged: list[Any] = []
    seen: set[str] = set()
    for item in cached.items:
        seen.add(item.pair)
        merged.append(fresh_by_pair.get(item.pair, item))
    for item in fresh:
        if item.pair not in seen:
            merged.append(item)
    return merged
