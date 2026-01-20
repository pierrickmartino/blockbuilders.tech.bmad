from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.strategy_template import StrategyTemplate
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.schemas.strategy_template import TemplateResponse, TemplateDetailResponse
from app.schemas.strategy import StrategyResponse
from app.core.plan_limits import get_plan_limits

router = APIRouter(prefix="/strategy-templates", tags=["strategy-templates"])


@router.get("/", response_model=list[TemplateResponse])
def list_templates(
    session: Session = Depends(get_session),
) -> list[TemplateResponse]:
    """List all published strategy templates."""
    templates = session.exec(
        select(StrategyTemplate)
        .where(StrategyTemplate.status == "published")
        .order_by(StrategyTemplate.created_at.desc())
    ).all()

    return [
        TemplateResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            logic_summary=t.logic_summary,
            use_cases=t.use_cases,
            parameter_ranges=t.parameter_ranges,
            asset=t.asset,
            timeframe=t.timeframe,
            created_at=t.created_at,
        )
        for t in templates
    ]


@router.get("/{template_id}", response_model=TemplateDetailResponse)
def get_template(
    template_id: UUID,
    session: Session = Depends(get_session),
) -> TemplateDetailResponse:
    """Get a single template with full details including definition."""
    template = session.get(StrategyTemplate, template_id)
    if not template or template.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    return TemplateDetailResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        logic_summary=template.logic_summary,
        use_cases=template.use_cases,
        parameter_ranges=template.parameter_ranges,
        asset=template.asset,
        timeframe=template.timeframe,
        created_at=template.created_at,
        definition_json=template.definition_json,
    )


@router.post("/{template_id}/clone", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
def clone_template(
    template_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StrategyResponse:
    """Clone a template into a new user strategy."""
    # Get template
    template = session.get(StrategyTemplate, template_id)
    if not template or template.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Check strategy limit (reuse pattern from duplicate_strategy)
    active_count = session.exec(
        select(func.count(Strategy.id)).where(
            Strategy.user_id == user.id,
            Strategy.is_archived == False,  # noqa: E712
        )
    ).one()
    limits = get_plan_limits(user.plan_tier)
    max_allowed = limits["max_strategies"] + user.extra_strategy_slots
    if active_count >= max_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Strategy limit reached ({max_allowed}). Upgrade your plan, purchase additional slots, or archive existing strategies.",
        )

    # Create new strategy from template
    new_strategy = Strategy(
        user_id=user.id,
        name=template.name,
        asset=template.asset,
        timeframe=template.timeframe,
    )
    session.add(new_strategy)
    session.commit()
    session.refresh(new_strategy)

    # Create version with template definition
    new_version = StrategyVersion(
        strategy_id=new_strategy.id,
        version_number=1,
        definition_json=template.definition_json,
    )
    session.add(new_version)
    session.commit()

    return StrategyResponse(
        id=new_strategy.id,
        name=new_strategy.name,
        asset=new_strategy.asset,
        timeframe=new_strategy.timeframe,
        is_archived=new_strategy.is_archived,
        auto_update_enabled=new_strategy.auto_update_enabled,
        auto_update_lookback_days=new_strategy.auto_update_lookback_days,
        last_auto_run_at=new_strategy.last_auto_run_at,
        created_at=new_strategy.created_at,
        updated_at=new_strategy.updated_at,
    )
