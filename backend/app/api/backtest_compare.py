"""API endpoint for comparing backtest runs."""
import logging

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.backtest_run import BacktestRun
from app.models.user import User
import app.services.backtest_responses as _backtest_responses
from app.backtest.storage import download_json
from app.schemas.backtest import (
    BacktestCompareRequest,
    BacktestCompareResponse,
    BacktestCompareRun,
    EquityCurvePoint,
)

router = APIRouter(prefix="/backtests", tags=["backtests"])


@router.post("/compare", response_model=BacktestCompareResponse)
def compare_backtests(
    data: BacktestCompareRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BacktestCompareResponse:
    """Compare 2-4 backtest runs with aligned equity curves and metrics."""

    if len(data.run_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least 2 backtest runs to compare.",
        )
    if len(data.run_ids) > 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 4 backtest runs can be compared at once.",
        )

    runs = []
    for run_id in data.run_ids:
        run = session.exec(
            select(BacktestRun).where(
                BacktestRun.id == run_id,
                BacktestRun.user_id == user.id,
            )
        ).first()
        if not run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backtest run {run_id} not found or not owned by you.",
            )
        if run.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Backtest run {run_id} is not completed. Only completed runs can be compared.",
            )
        runs.append(run)

    comparison_runs = []
    for run in runs:
        equity_curve = []
        if run.equity_curve_key:
            try:
                equity_data = download_json(run.equity_curve_key)
                equity_curve = [
                    EquityCurvePoint(timestamp=point["timestamp"], equity=point["equity"])
                    for point in equity_data
                ]
            except Exception as e:
                logger.warning(f"Failed to load equity curve for run {run.id}: {e}")

        summary = _backtest_responses._build_summary(run)

        comparison_runs.append(
            BacktestCompareRun(
                run_id=run.id,
                asset=run.asset,
                timeframe=run.timeframe,
                date_from=run.date_from,
                date_to=run.date_to,
                created_at=run.created_at,
                summary=summary,
                equity_curve=equity_curve,
            )
        )

    return BacktestCompareResponse(runs=comparison_runs)
