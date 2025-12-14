"""RQ job functions for backtest processing."""
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from redis import Redis
from rq import Queue
from sqlmodel import Session, select, func

from app.core.config import settings
from app.core.database import engine
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.backtest.candles import fetch_candles
from app.backtest.interpreter import interpret_strategy
from app.backtest.engine import run_backtest
from app.backtest.storage import upload_json, generate_results_key
from app.backtest.errors import BacktestError

logger = logging.getLogger(__name__)


def run_backtest_job(run_id: str) -> None:
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

    with Session(engine) as session:
        # Load run
        run = session.exec(
            select(BacktestRun).where(BacktestRun.id == run_uuid)
        ).first()

        if not run:
            logger.error(f"Backtest run not found: {run_id}")
            return

        # Check idempotency - only process pending runs
        if run.status != "pending":
            logger.info(f"Run {run_id} is not pending (status={run.status}), skipping")
            return

        # Set status to running
        run.status = "running"
        run.updated_at = datetime.now(timezone.utc)
        session.add(run)
        session.commit()

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

            logger.info(f"Processing backtest {run_id}: {run.asset} {run.timeframe} {run.date_from} - {run.date_to}")

            # Fetch candles
            candles = fetch_candles(
                asset=run.asset,
                timeframe=run.timeframe,
                date_from=run.date_from,
                date_to=run.date_to,
                session=session,
            )

            if not candles:
                raise BacktestError(
                    "No candles found for the specified period",
                    "No price data available for the selected date range.",
                )

            logger.info(f"Fetched {len(candles)} candles")

            # Interpret strategy to get signals
            signals = interpret_strategy(definition, candles)
            logger.info(f"Interpreted strategy: {sum(signals.entry_long)} entry signals, {sum(signals.exit_long)} exit signals")

            # Run backtest engine
            result = run_backtest(
                candles=candles,
                signals=signals,
                initial_balance=run.initial_balance,
                fee_rate=run.fee_rate,
                slippage_rate=run.slippage_rate,
            )

            logger.info(f"Backtest complete: {result.num_trades} trades, {result.total_return_pct}% return")

            # Upload results to S3
            equity_curve_key = generate_results_key(run.id, "equity_curve.json")
            upload_json(equity_curve_key, result.equity_curve)

            trades_data = [
                {
                    "entry_time": t.entry_time.isoformat(),
                    "entry_price": t.entry_price,
                    "exit_time": t.exit_time.isoformat(),
                    "exit_price": t.exit_price,
                    "side": t.side,
                    "pnl": t.pnl,
                }
                for t in result.trades
            ]
            trades_key = generate_results_key(run.id, "trades.json")
            upload_json(trades_key, trades_data)

            # Update run with results
            run.status = "completed"
            run.total_return = result.total_return_pct
            run.cagr = result.cagr_pct
            run.max_drawdown = result.max_drawdown_pct
            run.num_trades = result.num_trades
            run.win_rate = result.win_rate_pct
            run.equity_curve_key = equity_curve_key
            run.trades_key = trades_key
            run.updated_at = datetime.now(timezone.utc)
            session.add(run)

            # If this was an auto-run, update the strategy's last_auto_run_at
            if run.triggered_by == "auto":
                strategy = session.exec(
                    select(Strategy).where(Strategy.id == run.strategy_id)
                ).first()
                if strategy:
                    strategy.last_auto_run_at = datetime.now(timezone.utc)
                    session.add(strategy)

            session.commit()

            logger.info(f"Backtest {run_id} completed successfully")

        except BacktestError as e:
            logger.error(f"Backtest error for {run_id}: {e.message}")
            run.status = "failed"
            run.error_message = e.user_message
            run.updated_at = datetime.now(timezone.utc)
            session.add(run)
            session.commit()

        except Exception as e:
            logger.exception(f"Unexpected error processing backtest {run_id}")
            run.status = "failed"
            run.error_message = "An unexpected error occurred during backtest processing."
            run.updated_at = datetime.now(timezone.utc)
            session.add(run)
            session.commit()


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
