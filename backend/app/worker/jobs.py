"""RQ job functions for backtest processing."""
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

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
from app.backtest.errors import BacktestError
from app.services.alert_evaluator import evaluate_alerts_for_run
from app.services.analytics import track_backend_event, flush_backend_events

logger = logging.getLogger(__name__)


def run_backtest_job(run_id: str, force_refresh_prices: bool = False) -> None:
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

            # Bind correlation context for all subsequent logs in this job
            cid_token = correlation_id_var.set(str(run.id))
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
            run.updated_at = datetime.now(timezone.utc)
            session.add(run)
            session.commit()

            started_at = time.monotonic()
            track_backend_event(
                "backtest_job_started",
                user_id=run.user_id,
                strategy_id=run.strategy_id,
                correlation_id=run.id,
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

                logger.info("candles_fetched", extra={"count": len(candles)})

                # Interpret strategy to get signals
                signals = interpret_strategy(definition, candles)
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

                    # Evaluate performance alerts
                    evaluate_alerts_for_run(run, session)

                session.commit()

                duration_ms = int((time.monotonic() - started_at) * 1000)
                track_backend_event(
                    "backtest_job_completed",
                    user_id=run.user_id,
                    strategy_id=run.strategy_id,
                    correlation_id=run.id,
                    duration_ms=duration_ms,
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
        import httpx
        from app.models.alert_rule import AlertType, Direction
        from app.models.user import User
        from app.schemas.strategy import ALLOWED_ASSETS

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
            if alert.expires_at and alert.expires_at <= now:
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

        # Fetch current prices
        prices = _fetch_current_prices()
        if not prices:
            logger.error("Failed to fetch current prices, skipping evaluation")
            return

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


def _fetch_current_prices() -> dict[str, Any]:
    """
    Fetch current prices for all supported assets.

    Returns dict mapping asset pair (e.g., "BTC/USDT") to Decimal price.
    Reuses CryptoCompare API logic from market.py.
    """
    from decimal import Decimal
    import httpx
    from app.schemas.strategy import ALLOWED_ASSETS

    fsyms = [asset.split("/")[0] for asset in ALLOWED_ASSETS]
    fsyms_str = ",".join(fsyms)

    try:
        with httpx.Client(timeout=10.0) as client:
            url = f"{settings.cryptocompare_api_url}/pricemultifull"
            params = {"fsyms": fsyms_str, "tsyms": "USDT"}
            if settings.cryptocompare_api_key:
                params["api_key"] = settings.cryptocompare_api_key

            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if data.get("Response") == "Error":
                logger.error(f"CryptoCompare error: {data.get('Message')}")
                return {}

            raw_data = data.get("RAW", {})
            prices = {}

            for asset in ALLOWED_ASSETS:
                base = asset.split("/")[0]
                ticker_data = raw_data.get(base, {}).get("USDT")
                if ticker_data:
                    prices[asset] = Decimal(str(ticker_data.get("PRICE", 0.0)))

            return prices

    except Exception as e:
        logger.error(f"Failed to fetch prices: {e}")
        return {}


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


def _send_price_alert_webhook(alert: AlertRule, current_price: Any) -> None:
    """Send webhook POST for triggered price alert."""
    try:
        import httpx

        payload = {
            "type": "price_alert",
            "asset": alert.asset,
            "direction": alert.direction.value,
            "threshold_price": float(alert.threshold_price),
            "current_price": float(current_price),
            "triggered_at": datetime.now(timezone.utc).isoformat(),
        }

        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                alert.webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            logger.info(f"Webhook sent to {alert.webhook_url} for alert {alert.id}")

    except Exception as e:
        logger.error(f"Failed to send webhook for alert {alert.id}: {e}")
