from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.alert_rule import AlertRule
from app.models.strategy import Strategy
from app.models.user import User
from app.schemas.alert import (
    AlertRuleCreate,
    AlertRuleUpdate,
    AlertRuleResponse,
)

router = APIRouter(prefix="/alerts", tags=["alerts"])


def get_user_alert_rule(
    alert_id: UUID, user: User, session: Session
) -> AlertRule:
    """Get an alert rule owned by the current user, or raise 404."""
    rule = session.exec(
        select(AlertRule).where(
            AlertRule.id == alert_id,
            AlertRule.user_id == user.id
        )
    ).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")
    return rule


@router.get("/", response_model=list[AlertRuleResponse])
def list_alerts(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[AlertRuleResponse]:
    """List all alert rules for the current user."""
    rules = session.exec(
        select(AlertRule).where(AlertRule.user_id == user.id)
    ).all()
    return [
        AlertRuleResponse(
            id=rule.id,
            user_id=rule.user_id,
            strategy_id=rule.strategy_id,
            metric=rule.metric,
            threshold_pct=rule.threshold_pct,
            alert_on_entry=rule.alert_on_entry,
            alert_on_exit=rule.alert_on_exit,
            notify_in_app=rule.notify_in_app,
            notify_email=rule.notify_email,
            is_active=rule.is_active,
            last_triggered_run_id=rule.last_triggered_run_id,
            last_triggered_at=rule.last_triggered_at,
            created_at=rule.created_at,
            updated_at=rule.updated_at,
        )
        for rule in rules
    ]


@router.post("/", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    data: AlertRuleCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> AlertRuleResponse:
    """Create a new alert rule for a strategy."""
    # Validate strategy ownership
    strategy = session.exec(
        select(Strategy).where(
            Strategy.id == data.strategy_id,
            Strategy.user_id == user.id
        )
    ).first()
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")

    # Check for duplicate rule (one rule per strategy)
    existing = session.exec(
        select(AlertRule).where(AlertRule.strategy_id == data.strategy_id)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alert rule already exists for this strategy"
        )

    # Create alert rule
    rule = AlertRule(
        user_id=user.id,
        strategy_id=data.strategy_id,
        threshold_pct=data.threshold_pct,
        alert_on_entry=data.alert_on_entry,
        alert_on_exit=data.alert_on_exit,
        notify_email=data.notify_email,
        is_active=data.is_active,
    )
    session.add(rule)
    session.commit()
    session.refresh(rule)

    return AlertRuleResponse(
        id=rule.id,
        user_id=rule.user_id,
        strategy_id=rule.strategy_id,
        metric=rule.metric,
        threshold_pct=rule.threshold_pct,
        alert_on_entry=rule.alert_on_entry,
        alert_on_exit=rule.alert_on_exit,
        notify_in_app=rule.notify_in_app,
        notify_email=rule.notify_email,
        is_active=rule.is_active,
        last_triggered_run_id=rule.last_triggered_run_id,
        last_triggered_at=rule.last_triggered_at,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
    )


@router.patch("/{alert_id}", response_model=AlertRuleResponse)
def update_alert(
    alert_id: UUID,
    data: AlertRuleUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> AlertRuleResponse:
    """Update an existing alert rule."""
    rule = get_user_alert_rule(alert_id, user, session)

    # Update fields if provided
    if data.threshold_pct is not None:
        rule.threshold_pct = data.threshold_pct
    if data.alert_on_entry is not None:
        rule.alert_on_entry = data.alert_on_entry
    if data.alert_on_exit is not None:
        rule.alert_on_exit = data.alert_on_exit
    if data.notify_email is not None:
        rule.notify_email = data.notify_email
    if data.is_active is not None:
        rule.is_active = data.is_active

    rule.updated_at = datetime.now(timezone.utc)

    session.add(rule)
    session.commit()
    session.refresh(rule)

    return AlertRuleResponse(
        id=rule.id,
        user_id=rule.user_id,
        strategy_id=rule.strategy_id,
        metric=rule.metric,
        threshold_pct=rule.threshold_pct,
        alert_on_entry=rule.alert_on_entry,
        alert_on_exit=rule.alert_on_exit,
        notify_in_app=rule.notify_in_app,
        notify_email=rule.notify_email,
        is_active=rule.is_active,
        last_triggered_run_id=rule.last_triggered_run_id,
        last_triggered_at=rule.last_triggered_at,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
    )


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Delete an alert rule."""
    rule = get_user_alert_rule(alert_id, user, session)
    session.delete(rule)
    session.commit()
