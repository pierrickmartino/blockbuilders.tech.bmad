"""RQ job functions for backtest processing."""
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import engine
from app.models.backtest_run import BacktestRun
from app.models.strategy_version import StrategyVersion
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
