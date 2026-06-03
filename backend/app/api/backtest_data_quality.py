"""Data-quality endpoints for backtest runs."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_session
from app.backtest.data_quality import query_metrics_for_range, compute_completeness_metrics
from app.models.user import User
from app.schemas.backtest import DataCompletenessResponse, DataQualityMetrics

from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backtests", tags=["backtests"])


@router.get("/data-quality", response_model=DataQualityMetrics)
def get_data_quality(
    asset: str = Query(..., description="Asset pair e.g. BTC/USDT"),
    timeframe: str = Query(..., description="Timeframe e.g. 1d or 4h"),
    date_from: str = Query(..., description="Start date (ISO 8601 format)"),
    date_to: str = Query(..., description="End date (ISO 8601 format)"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> DataQualityMetrics:
    """
    Get data quality metrics for specified asset/timeframe/date range.
    Aggregates daily metrics over the period.
    """
    try:
        date_from_dt = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        date_to_dt = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
    except (ValueError, AttributeError) as e:
        logger.error(
            "Failed to parse dates for data-quality endpoint: date_from=%s, date_to=%s, error=%s",
            date_from, date_to, e,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format. Use ISO 8601 format (e.g., 2025-01-31T00:00:00Z): {str(e)}",
        )

    if date_to_dt <= date_from_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_to must be after date_from",
        )

    metrics_list = query_metrics_for_range(asset, timeframe, date_from_dt, date_to_dt, session)

    if not metrics_list:
        return DataQualityMetrics(
            asset=asset,
            timeframe=timeframe,
            date_from=date_from_dt,
            date_to=date_to_dt,
            gap_percent=0.0,
            outlier_count=0,
            volume_consistency=100.0,
            has_issues=False,
            issues_description="No quality data available yet",
        )

    gap_percent_avg = sum(m.gap_percent for m in metrics_list) / len(metrics_list)
    outlier_count_total = sum(m.outlier_count for m in metrics_list)
    volume_consistency_avg = sum(m.volume_consistency for m in metrics_list) / len(metrics_list)
    has_issues = any(m.has_issues for m in metrics_list)

    issues_parts = []
    if gap_percent_avg > settings.data_quality_gap_threshold:
        issues_parts.append(f"{gap_percent_avg:.1f}% missing candles")
    if outlier_count_total > 0:
        issues_parts.append(f"{outlier_count_total} price outliers")
    if volume_consistency_avg < settings.data_quality_volume_threshold:
        issues_parts.append(f"{volume_consistency_avg:.1f}% volume consistency")

    return DataQualityMetrics(
        asset=asset,
        timeframe=timeframe,
        date_from=date_from_dt,
        date_to=date_to_dt,
        gap_percent=gap_percent_avg,
        outlier_count=outlier_count_total,
        volume_consistency=volume_consistency_avg,
        has_issues=has_issues,
        issues_description=", ".join(issues_parts) if issues_parts else "Data quality OK",
    )


@router.get("/data-completeness", response_model=DataCompletenessResponse)
def get_data_completeness(
    asset: str = Query(..., description="Asset pair (e.g., BTC/USDT)"),
    timeframe: str = Query(..., description="Timeframe (e.g., 1d, 4h)"),
    session: Session = Depends(get_session),
) -> DataCompletenessResponse:
    """
    Get data completeness metrics and gap ranges for asset/timeframe.

    Returns coverage range, completeness percent, gap count, gap duration, and gap ranges.
    No authentication required - read-only public data.
    """
    metrics = compute_completeness_metrics(asset, timeframe, session)

    return DataCompletenessResponse(
        asset=asset,
        timeframe=timeframe,
        coverage_start=metrics["coverage_start"],
        coverage_end=metrics["coverage_end"],
        completeness_percent=metrics["completeness_percent"],
        gap_count=metrics["gap_count"],
        gap_total_hours=metrics["gap_total_hours"],
        gap_ranges=metrics["gap_ranges"],
    )
