import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import case, extract, literal
from sqlmodel import Session, select, func, and_

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_session
from app.core.plans import get_plan_limits
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy, StrategyEntryPath
from app.models.strategy_tag import StrategyTag
from app.models.strategy_tag_link import StrategyTagLink
from app.models.strategy_draft import StrategyDraft
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.services.working_copy import get_or_create_working_copy, upsert_working_copy
from app.schemas.strategy import (
    BulkStrategyRequest,
    BulkStrategyResponse,
    BulkStrategyTagRequest,
    StrategyCreateRequest,
    StrategyDefinitionValidate,
    StrategyDeleteResponse,
    StrategyDraftFromNlRequest,
    StrategyDraftFromNlResponse,
    StrategyDraftResponse,
    StrategyDraftUpsertRequest,
    StrategyResponse,
    StrategyTagResponse,
    StrategyUpdateRequest,
    StrategyVersionDetailResponse,
    StrategyVersionResponse,
    StrategyWithMetricsResponse,
    ValidationError,
    ValidationResponse,
)
from app.services.strategy_deletion import delete_strategy_cascade
from app.services.strategy_draft_pipeline import DraftPipelineDeclined, draft_and_repair
from app.services.strategy_drafter import StrategyDrafterError, get_strategy_drafter
from app.services.strategy_drafter_rate_limit import get_strategy_drafter_rate_limiter
from app.services.strategy_validation import collect_validation_errors

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/strategies", tags=["strategies"])

# Period buckets: (label, min_days, max_days) — non-overlapping ranges
PERIOD_BUCKETS = [
    ("30d", 20, 40),
    ("60d", 45, 75),
    ("90d", 75, 105),
    ("1y", 330, 400),
    ("2y", 660, 800),
    ("3y", 990, 1200),
]


def get_user_strategy(
    strategy_id: UUID, user: User, session: Session
) -> Strategy:
    """Get a strategy owned by the current user, or raise 404."""
    strategy = session.exec(
        select(Strategy).where(Strategy.id == strategy_id, Strategy.user_id == user.id)
    ).first()
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
    return strategy


def load_strategy_tags(strategy_id: UUID, session: Session) -> list[StrategyTagResponse]:
    """Load all tags for a strategy."""
    tags = session.exec(
        select(StrategyTag)
        .join(StrategyTagLink, StrategyTag.id == StrategyTagLink.tag_id)
        .where(StrategyTagLink.strategy_id == strategy_id)
        .order_by(StrategyTag.name)
    ).all()

    return [
        StrategyTagResponse(
            id=tag.id,
            name=tag.name,
            created_at=tag.created_at,
            updated_at=tag.updated_at,
        )
        for tag in tags
    ]


def batch_load_strategy_tags(
    strategy_ids: list[UUID], session: Session
) -> dict[UUID, list[StrategyTagResponse]]:
    """Load all tags for multiple strategies in a single query.

    Returns a dict mapping strategy_id -> list of tags.
    """
    if not strategy_ids:
        return {}

    # Single query to fetch all tags for all strategies
    results = session.exec(
        select(StrategyTagLink.strategy_id, StrategyTag)
        .join(StrategyTag, StrategyTag.id == StrategyTagLink.tag_id)
        .where(StrategyTagLink.strategy_id.in_(strategy_ids))
        .order_by(StrategyTag.name)
    ).all()

    # Group tags by strategy_id
    tags_by_strategy: dict[UUID, list[StrategyTagResponse]] = {
        sid: [] for sid in strategy_ids
    }
    for strategy_id, tag in results:
        tags_by_strategy[strategy_id].append(
            StrategyTagResponse(
                id=tag.id,
                name=tag.name,
                created_at=tag.created_at,
                updated_at=tag.updated_at,
            )
        )

    return tags_by_strategy


@router.post("/", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
def create_strategy(
    data: StrategyCreateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyResponse:
    """Create a new strategy."""
    # Check strategy limit based on plan tier
    active_count = session.exec(
        select(func.count(Strategy.id)).where(
            Strategy.user_id == user.id,
            Strategy.is_archived == False,  # noqa: E712
        )
    ).one()
    from app.core.plans import get_effective_limits

    effective_limits = get_effective_limits(
        user.plan_tier, user.user_tier, user.extra_strategy_slots
    )
    max_allowed = effective_limits["max_strategies"]
    if active_count >= max_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Strategy limit reached ({max_allowed}). Upgrade your plan, purchase additional slots, or archive existing strategies.",
        )

    strategy = Strategy(
        user_id=user.id,
        name=data.name,
        asset=data.asset,
        timeframe=data.timeframe,
        # Stamped once at creation from the caller's self-reported launch
        # surface (ADR-0009). `None` when the caller doesn't report one (e.g.
        # JSON import) — the column stays null rather than guessing.
        entry_path=data.entry_path,
    )
    session.add(strategy)
    session.commit()
    session.refresh(strategy)

    # Eagerly create the working copy seeded with the default definition (ADR-0005).
    get_or_create_working_copy(strategy, session)

    return StrategyResponse(
        id=strategy.id,
        name=strategy.name,
        asset=strategy.asset,
        timeframe=strategy.timeframe,
        entry_path=strategy.entry_path,
        is_archived=strategy.is_archived,
        auto_update_enabled=strategy.auto_update_enabled,
        auto_update_lookback_days=strategy.auto_update_lookback_days,
        last_auto_run_at=strategy.last_auto_run_at,
        digest_email_enabled=strategy.digest_email_enabled,
        created_at=strategy.created_at,
        updated_at=strategy.updated_at,
        tags=[],
    )


@router.post("/draft-from-nl", response_model=StrategyDraftFromNlResponse)
def draft_strategy_from_nl(
    data: StrategyDraftFromNlRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyDraftFromNlResponse:
    """Draft a new strategy from NL text (NL wedge, ADR-0011/ADR-0006/ADR-0015).

    `asset`/`timeframe` come from explicit UI controls and are authoritative;
    the drafter never sees them and must not infer them from `nl_text`.
    Three outcomes, nothing partial persists: `success` (one Strategy +
    working copy created), `declined` (drafter or validator couldn't produce
    a usable graph, even after the bounded repair pass), `disabled` (feature
    flag off). A bounded-timeout provider error or exhausted instructor
    schema-retries raises a 503 — a retryable infra failure, distinct from
    `declined` (issue #589). Exceeding the per-user anti-abuse ceiling
    (ADR-0016) raises a 429 — also a serve failure, not folded into `outcome`.
    """
    if not settings.strategy_drafter_enabled:
        return StrategyDraftFromNlResponse(outcome="disabled")

    if not get_strategy_drafter_rate_limiter().allow(user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You're drafting faster than we allow right now — try again shortly.",
        )

    try:
        pipeline_result = draft_and_repair(get_strategy_drafter(), data.nl_text)
    except StrategyDrafterError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    # Repair-resolution telemetry (issue #626): server-side aggregate signal
    # for tuning `strategy_drafter_max_repairs`, independent of Draft outcome.
    logger.info("strategy_draft_resolution", extra={"resolution": pipeline_result.resolution})

    if isinstance(pipeline_result, DraftPipelineDeclined):
        return StrategyDraftFromNlResponse(outcome="declined", reason=pipeline_result.reason)

    strategy = Strategy(
        user_id=user.id,
        name=data.nl_text[:100],
        asset=data.asset,
        timeframe=data.timeframe,
        entry_path=StrategyEntryPath.NL_WEDGE,
    )
    session.add(strategy)
    session.commit()
    session.refresh(strategy)

    upsert_working_copy(strategy, pipeline_result.definition, session)

    return StrategyDraftFromNlResponse(outcome="success", strategy_id=strategy.id)


@router.get("/", response_model=list[StrategyWithMetricsResponse])
def list_strategies(
    search: str = Query(default="", description="Filter by name (case-insensitive)"),
    include_archived: bool = Query(default=False, description="Include archived strategies"),
    tag_ids: list[UUID] | None = Query(default=None, description="Filter by tag IDs (OR logic)"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[StrategyWithMetricsResponse]:
    """List all strategies for the current user with latest backtest metrics."""
    # Subquery to get a deterministic latest completed backtest per strategy.
    # Break ties on identical created_at using the highest id.
    latest_run_subquery = (
        select(
            BacktestRun.id.label("latest_run_id"),
            BacktestRun.strategy_id,
            func.row_number()
            .over(
                partition_by=BacktestRun.strategy_id,
                order_by=(BacktestRun.created_at.desc(), BacktestRun.id.desc()),
            )
            .label("row_number"),
        )
        .where(BacktestRun.status == "completed")
        .subquery()
    )
    latest_run_subquery = (
        select(
            latest_run_subquery.c.latest_run_id,
            latest_run_subquery.c.strategy_id,
        )
        .where(latest_run_subquery.c.row_number == 1)
        .subquery()
    )

    # Main query with LEFT JOIN to include metrics
    query = (
        select(Strategy, BacktestRun)
        .outerjoin(
            latest_run_subquery,
            Strategy.id == latest_run_subquery.c.strategy_id,
        )
        .outerjoin(
            BacktestRun,
            and_(
                BacktestRun.id == latest_run_subquery.c.latest_run_id,
            ),
        )
        .where(Strategy.user_id == user.id)
    )

    if not include_archived:
        query = query.where(Strategy.is_archived == False)  # noqa: E712

    if search:
        query = query.where(Strategy.name.ilike(f"%{search}%"))

    # Filter by tags (OR logic: show strategies that have ANY of the selected tags)
    if tag_ids:
        query = query.where(
            Strategy.id.in_(
                select(StrategyTagLink.strategy_id).where(
                    StrategyTagLink.tag_id.in_(tag_ids)
                )
            )
        )

    query = query.order_by(Strategy.updated_at.desc())
    results = session.exec(query).all()

    # Batch load all tags in a single query (fixes N+1)
    strategy_ids = [s.id for s, _ in results]
    tags_by_strategy = batch_load_strategy_tags(strategy_ids, session)

    # Batch load period returns: classify completed runs by duration bucket
    period_returns_by_strategy: dict[UUID, dict[str, float]] = {}
    if strategy_ids:
        bind = session.get_bind()
        dialect_name = bind.dialect.name if bind is not None else ""
        if dialect_name == "sqlite":
            duration_days = func.julianday(BacktestRun.date_to) - func.julianday(
                BacktestRun.date_from
            )
        else:
            duration_days = extract(
                "epoch", BacktestRun.date_to - BacktestRun.date_from
            ) / literal(86400.0)
        period_label = case(
            *[
                (
                    and_(duration_days >= min_d, duration_days <= max_d),
                    literal(label),
                )
                for label, min_d, max_d in PERIOD_BUCKETS
            ],
        ).label("period_label")

        ranked = (
            select(
                BacktestRun.strategy_id,
                period_label,
                BacktestRun.total_return,
                func.row_number()
                .over(
                    partition_by=[BacktestRun.strategy_id, period_label],
                    order_by=(BacktestRun.created_at.desc(), BacktestRun.id.desc()),
                )
                .label("rn"),
            )
            .where(BacktestRun.status == "completed")
            .where(BacktestRun.strategy_id.in_(strategy_ids))
            .where(period_label.isnot(None))
            .subquery()
        )

        period_rows = session.exec(
            select(ranked.c.strategy_id, ranked.c.period_label, ranked.c.total_return)
            .where(ranked.c.rn == 1)
        ).all()

        for sid, plabel, treturn in period_rows:
            period_returns_by_strategy.setdefault(sid, {})[plabel] = treturn

    return [
        StrategyWithMetricsResponse(
            id=s.id,
            name=s.name,
            asset=s.asset,
            timeframe=s.timeframe,
            is_archived=s.is_archived,
            auto_update_enabled=s.auto_update_enabled,
            auto_update_lookback_days=s.auto_update_lookback_days,
            last_auto_run_at=s.last_auto_run_at,
            digest_email_enabled=s.digest_email_enabled,
            created_at=s.created_at,
            updated_at=s.updated_at,
            latest_total_return_pct=backtest.total_return if backtest else None,
            latest_max_drawdown_pct=backtest.max_drawdown if backtest else None,
            latest_win_rate_pct=backtest.win_rate if backtest else None,
            latest_num_trades=backtest.num_trades if backtest else None,
            last_run_at=backtest.created_at if backtest else None,
            tags=tags_by_strategy.get(s.id, []),
            **(
                {
                    f"return_{k}": v
                    for k, v in period_returns_by_strategy.get(s.id, {}).items()
                }
            ),
        )
        for s, backtest in results
    ]


@router.get("/{strategy_id}", response_model=StrategyResponse)
def get_strategy(
    strategy_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyResponse:
    """Get a single strategy by ID."""
    strategy = get_user_strategy(strategy_id, user, session)
    return StrategyResponse(
        id=strategy.id,
        name=strategy.name,
        asset=strategy.asset,
        timeframe=strategy.timeframe,
        is_archived=strategy.is_archived,
        auto_update_enabled=strategy.auto_update_enabled,
        auto_update_lookback_days=strategy.auto_update_lookback_days,
        last_auto_run_at=strategy.last_auto_run_at,
        digest_email_enabled=strategy.digest_email_enabled,
        created_at=strategy.created_at,
        updated_at=strategy.updated_at,
        tags=load_strategy_tags(strategy_id, session),
    )


@router.patch("/{strategy_id}", response_model=StrategyResponse)
def update_strategy(
    strategy_id: UUID,
    data: StrategyUpdateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyResponse:
    """Update a strategy's metadata."""
    strategy = get_user_strategy(strategy_id, user, session)

    if data.name is not None:
        strategy.name = data.name
    if data.asset is not None:
        strategy.asset = data.asset
    if data.timeframe is not None:
        strategy.timeframe = data.timeframe
    if data.is_archived is not None:
        strategy.is_archived = data.is_archived
    if data.auto_update_enabled is not None:
        strategy.auto_update_enabled = data.auto_update_enabled
    if data.auto_update_lookback_days is not None:
        strategy.auto_update_lookback_days = data.auto_update_lookback_days
    if data.digest_email_enabled is not None:
        strategy.digest_email_enabled = data.digest_email_enabled

    # Handle tag updates
    if data.tag_ids is not None:
        unique_tag_ids = list(dict.fromkeys(data.tag_ids)) if data.tag_ids else []
        # Validate that all tags belong to the user
        if unique_tag_ids:
            tag_count = session.exec(
                select(func.count(StrategyTag.id)).where(
                    StrategyTag.id.in_(unique_tag_ids),
                    StrategyTag.user_id == user.id
                )
            ).one()
            if tag_count != len(unique_tag_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more tags do not exist or do not belong to you"
                )

        # Delete existing links in bulk
        session.query(StrategyTagLink).filter(
            StrategyTagLink.strategy_id == strategy_id
        ).delete()

        # Create new links
        for tag_id in unique_tag_ids:
            link = StrategyTagLink(strategy_id=strategy_id, tag_id=tag_id)
            session.add(link)

    strategy.updated_at = datetime.now(timezone.utc)
    session.add(strategy)
    session.commit()
    session.refresh(strategy)

    return StrategyResponse(
        id=strategy.id,
        name=strategy.name,
        asset=strategy.asset,
        timeframe=strategy.timeframe,
        is_archived=strategy.is_archived,
        auto_update_enabled=strategy.auto_update_enabled,
        auto_update_lookback_days=strategy.auto_update_lookback_days,
        last_auto_run_at=strategy.last_auto_run_at,
        digest_email_enabled=strategy.digest_email_enabled,
        created_at=strategy.created_at,
        updated_at=strategy.updated_at,
        tags=load_strategy_tags(strategy_id, session),
    )


@router.post("/{strategy_id}/duplicate", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
def duplicate_strategy(
    strategy_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyResponse:
    """Duplicate a strategy with its latest version."""
    # Check strategy limit based on plan tier
    active_count = session.exec(
        select(func.count(Strategy.id)).where(
            Strategy.user_id == user.id,
            Strategy.is_archived == False,  # noqa: E712
        )
    ).one()
    from app.core.plans import get_effective_limits

    effective_limits = get_effective_limits(
        user.plan_tier, user.user_tier, user.extra_strategy_slots
    )
    max_allowed = effective_limits["max_strategies"]
    if active_count >= max_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Strategy limit reached ({max_allowed}). Upgrade your plan, purchase additional slots, or archive existing strategies.",
        )

    original = get_user_strategy(strategy_id, user, session)

    # Create new strategy with "(copy)" suffix
    new_strategy = Strategy(
        user_id=user.id,
        name=f"{original.name} (copy)",
        asset=original.asset,
        timeframe=original.timeframe,
    )
    session.add(new_strategy)
    session.commit()
    session.refresh(new_strategy)

    # Seed the new working copy from the original's working copy (ADR-0005).
    # The editor reads from the working copy, so the duplicate must carry the
    # original's current editing state — not just its frozen versions.
    source_wc = get_or_create_working_copy(original, session)
    upsert_working_copy(new_strategy, source_wc.definition_json, session)

    return StrategyResponse(
        id=new_strategy.id,
        name=new_strategy.name,
        asset=new_strategy.asset,
        timeframe=new_strategy.timeframe,
        is_archived=new_strategy.is_archived,
        auto_update_enabled=new_strategy.auto_update_enabled,
        auto_update_lookback_days=new_strategy.auto_update_lookback_days,
        last_auto_run_at=new_strategy.last_auto_run_at,
        digest_email_enabled=new_strategy.digest_email_enabled,
        created_at=new_strategy.created_at,
        updated_at=new_strategy.updated_at,
    )


@router.get("/{strategy_id}/versions", response_model=list[StrategyVersionResponse])
def list_versions(
    strategy_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[StrategyVersionResponse]:
    """List all versions of a strategy."""
    strategy = get_user_strategy(strategy_id, user, session)

    versions = session.exec(
        select(StrategyVersion)
        .where(StrategyVersion.strategy_id == strategy.id)
        .order_by(StrategyVersion.version_number.desc())
    ).all()

    return [
        StrategyVersionResponse(
            id=v.id,
            version_number=v.version_number,
            created_at=v.created_at,
        )
        for v in versions
    ]


@router.get("/{strategy_id}/versions/{version_number}", response_model=StrategyVersionDetailResponse)
def get_version(
    strategy_id: UUID,
    version_number: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyVersionDetailResponse:
    """Get a specific version of a strategy with its definition."""
    strategy = get_user_strategy(strategy_id, user, session)

    version = session.exec(
        select(StrategyVersion).where(
            StrategyVersion.strategy_id == strategy.id,
            StrategyVersion.version_number == version_number,
        )
    ).first()

    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    return StrategyVersionDetailResponse(
        id=version.id,
        version_number=version.version_number,
        definition_json=version.definition_json,
        created_at=version.created_at,
    )



@router.post("/{strategy_id}/validate", response_model=ValidationResponse)
def validate_strategy(
    strategy_id: UUID,
    definition: StrategyDefinitionValidate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ValidationResponse:
    """Validate a strategy definition without saving."""
    # Verify user owns the strategy
    get_user_strategy(strategy_id, user, session)

    errors = collect_validation_errors(definition)

    return ValidationResponse(
        status="valid" if not errors else "invalid",
        errors=errors,
    )


# ---------------------------------------------------------------------------
# Working-copy endpoints (ADR-0005, issue #514)
# The working copy lives in strategy_drafts (1:1 with strategy).
# GET never 404s for an owned strategy — get_or_create ensures it exists.
# PUT is a no-validation-gate upsert: safe for debounced background saves.
# ---------------------------------------------------------------------------


@router.get("/{strategy_id}/draft", response_model=StrategyDraftResponse)
def get_draft(
    strategy_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyDraftResponse:
    """Return the working copy for a strategy. Never 404s for an owned strategy."""
    strategy = get_user_strategy(strategy_id, user, session)
    wc = get_or_create_working_copy(strategy, session)
    return StrategyDraftResponse(
        strategy_id=wc.strategy_id,
        definition_json=wc.definition_json,
        updated_at=wc.updated_at,
    )


@router.put("/{strategy_id}/draft", response_model=StrategyDraftResponse)
def upsert_draft(
    strategy_id: UUID,
    data: StrategyDraftUpsertRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyDraftResponse:
    """Upsert the working copy for a strategy (no validation gate).

    Idempotent — safe for debounced retries. Always writes to strategy_drafts.
    """
    strategy = get_user_strategy(strategy_id, user, session)
    wc = upsert_working_copy(strategy, data.definition_json, session)
    return StrategyDraftResponse(
        strategy_id=wc.strategy_id,
        definition_json=wc.definition_json,
        updated_at=wc.updated_at,
    )


@router.post("/{strategy_id}/draft/validate", response_model=ValidationResponse)
def validate_draft(
    strategy_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ValidationResponse:
    """Validate the persisted working copy without saving (read-only).

    The editor calls this after every autosave for live validation feedback.
    Takes no body — it reads the definition straight from strategy_drafts.
    A malformed/empty draft yields an ``invalid`` status rather than a 500,
    matching the editor's best-effort handling of this call.
    """
    strategy = get_user_strategy(strategy_id, user, session)
    wc = get_or_create_working_copy(strategy, session)

    try:
        definition = StrategyDefinitionValidate.model_validate(wc.definition_json)
    except PydanticValidationError:
        return ValidationResponse(
            status="invalid",
            errors=[
                ValidationError(
                    code="malformed_draft",
                    message="Draft definition could not be parsed.",
                )
            ],
        )

    errors = collect_validation_errors(definition)

    return ValidationResponse(
        status="valid" if not errors else "invalid",
        errors=errors,
    )


# Bulk operations
@router.post("/bulk/archive", response_model=BulkStrategyResponse)
def bulk_archive_strategies(
    data: BulkStrategyRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BulkStrategyResponse:
    """Archive multiple strategies."""
    success_count = 0
    failed_ids = []

    for strategy_id in data.strategy_ids:
        try:
            strategy = get_user_strategy(strategy_id, user, session)
            strategy.is_archived = True
            strategy.updated_at = datetime.now(timezone.utc)
            session.add(strategy)
            session.commit()
            success_count += 1
        except HTTPException:
            failed_ids.append(strategy_id)
        except Exception:
            session.rollback()
            failed_ids.append(strategy_id)

    return BulkStrategyResponse(
        success_count=success_count,
        failed_count=len(failed_ids),
        failed_ids=failed_ids,
    )


@router.post("/bulk/tag", response_model=BulkStrategyResponse)
def bulk_tag_strategies(
    data: BulkStrategyTagRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BulkStrategyResponse:
    """Apply tags to multiple strategies (replaces existing tags)."""
    # Validate all tags belong to user
    tag_count = session.exec(
        select(func.count(StrategyTag.id)).where(
            StrategyTag.id.in_(data.tag_ids),
            StrategyTag.user_id == user.id,
        )
    ).one()
    if tag_count != len(data.tag_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more tags do not exist or do not belong to you",
        )

    success_count = 0
    failed_ids = []

    for strategy_id in data.strategy_ids:
        try:
            strategy = get_user_strategy(strategy_id, user, session)

            # Delete existing tag links
            session.exec(
                select(StrategyTagLink).where(StrategyTagLink.strategy_id == strategy_id)
            ).all()
            session.query(StrategyTagLink).filter(
                StrategyTagLink.strategy_id == strategy_id
            ).delete()

            # Create new tag links
            for tag_id in data.tag_ids:
                link = StrategyTagLink(strategy_id=strategy_id, tag_id=tag_id)
                session.add(link)

            strategy.updated_at = datetime.now(timezone.utc)
            session.add(strategy)
            session.commit()
            success_count += 1
        except HTTPException:
            session.rollback()
            failed_ids.append(strategy_id)
        except Exception:
            session.rollback()
            failed_ids.append(strategy_id)

    return BulkStrategyResponse(
        success_count=success_count,
        failed_count=len(failed_ids),
        failed_ids=failed_ids,
    )


@router.delete("/{strategy_id}", response_model=StrategyDeleteResponse)
def delete_strategy(
    strategy_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyDeleteResponse:
    """Permanently delete a strategy and all related data (ADR-0006 reject)."""
    delete_strategy_cascade(strategy_id, user, session)
    session.commit()
    return StrategyDeleteResponse(id=strategy_id, deleted=True)


@router.post("/bulk/delete", response_model=BulkStrategyResponse)
def bulk_delete_strategies(
    data: BulkStrategyRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BulkStrategyResponse:
    """Permanently delete multiple strategies and all related data."""
    # First pass: verify ownership for all strategies, collect valid ones
    valid_ids = []
    failed_ids = []

    for strategy_id in data.strategy_ids:
        try:
            get_user_strategy(strategy_id, user, session)
            valid_ids.append(strategy_id)
        except HTTPException:
            failed_ids.append(strategy_id)

    if not valid_ids:
        return BulkStrategyResponse(
            success_count=0,
            failed_count=len(failed_ids),
            failed_ids=failed_ids,
        )

    # Second pass: delete all valid strategies via the shared cascade
    try:
        for strategy_id in valid_ids:
            delete_strategy_cascade(strategy_id, user, session)
        session.commit()

        return BulkStrategyResponse(
            success_count=len(valid_ids),
            failed_count=len(failed_ids),
            failed_ids=failed_ids,
        )
    except Exception:
        session.rollback()
        # If bulk delete fails, all valid strategies are marked as failed
        failed_ids.extend(valid_ids)
        return BulkStrategyResponse(
            success_count=0,
            failed_count=len(failed_ids),
            failed_ids=failed_ids,
        )
