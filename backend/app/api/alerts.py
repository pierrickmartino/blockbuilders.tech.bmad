import ipaddress
import socket
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.alert_rule import AlertRule, AlertType
from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_version import StrategyVersion
from app.models.user import User
from app.schemas.alert import (
    AlertRuleCreate,
    AlertRuleUpdate,
    AlertRuleResponse,
)

router = APIRouter(prefix="/alerts", tags=["alerts"])

# Blocked IP ranges for SSRF prevention
BLOCKED_IP_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),      # Private
    ipaddress.ip_network("172.16.0.0/12"),   # Private
    ipaddress.ip_network("192.168.0.0/16"),  # Private
    ipaddress.ip_network("127.0.0.0/8"),     # Loopback
    ipaddress.ip_network("169.254.0.0/16"),  # Link-local
    ipaddress.ip_network("0.0.0.0/8"),       # Current network
]


def validate_webhook_url(url: str | None) -> None:
    """Validate webhook URL to prevent SSRF attacks.

    Raises HTTPException if URL is invalid or points to internal resources.
    """
    if not url:
        return

    try:
        parsed = urlparse(url)

        # Must be HTTPS
        if parsed.scheme != "https":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Webhook URL must use HTTPS",
            )

        # Must have a hostname
        if not parsed.hostname:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook URL: missing hostname",
            )

        # Block localhost variants
        hostname_lower = parsed.hostname.lower()
        if hostname_lower in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Webhook URL cannot point to localhost",
            )

        # Resolve hostname and check IP
        try:
            ip = socket.gethostbyname(parsed.hostname)
            ip_addr = ipaddress.ip_address(ip)

            for blocked_range in BLOCKED_IP_RANGES:
                if ip_addr in blocked_range:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Webhook URL cannot point to internal network",
                    )
        except socket.gaierror:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook URL: hostname could not be resolved",
            )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook URL format",
        )


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


def _compute_is_stale(alert: AlertRule, session: Session) -> bool:
    """Return True if the alert's pinned version is not the latest for its strategy."""
    if alert.alert_type != AlertType.PERFORMANCE or alert.strategy_version_id is None:
        return False
    latest = session.exec(
        select(StrategyVersion)
        .where(StrategyVersion.strategy_id == alert.strategy_id)
        .order_by(StrategyVersion.version_number.desc())
    ).first()
    return latest is not None and latest.id != alert.strategy_version_id


def _map_to_response(rule: AlertRule, is_stale: bool = False) -> AlertRuleResponse:
    """Map AlertRule model to response schema."""
    return AlertRuleResponse(
        id=rule.id,
        user_id=rule.user_id,
        alert_type=rule.alert_type,
        strategy_id=rule.strategy_id,
        strategy_version_id=rule.strategy_version_id,
        metric=rule.metric,
        threshold_pct=rule.threshold_pct,
        alert_on_entry=rule.alert_on_entry,
        alert_on_exit=rule.alert_on_exit,
        last_triggered_run_id=rule.last_triggered_run_id,
        last_fired_candle_ts=rule.last_fired_candle_ts,
        asset=rule.asset,
        direction=rule.direction,
        threshold_price=rule.threshold_price,
        notify_webhook=rule.notify_webhook,
        webhook_url=rule.webhook_url,
        expires_at=rule.expires_at,
        last_checked_price=rule.last_checked_price,
        notify_in_app=rule.notify_in_app,
        notify_email=rule.notify_email,
        is_active=rule.is_active,
        is_stale=is_stale,
        last_triggered_at=rule.last_triggered_at,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
    )


@router.get("/", response_model=list[AlertRuleResponse])
def list_alerts(
    alert_type: Optional[str] = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[AlertRuleResponse]:
    """List all alert rules for the current user, optionally filtered by type."""
    query = select(AlertRule).where(AlertRule.user_id == user.id)
    if alert_type:
        query = query.where(AlertRule.alert_type == alert_type)
    rules = session.exec(query).all()
    return [_map_to_response(rule, _compute_is_stale(rule, session)) for rule in rules]


@router.post("/", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    data: AlertRuleCreate,
    response: Response,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> AlertRuleResponse:
    """Create a new alert rule (performance or price)."""

    if data.alert_type == AlertType.PERFORMANCE:
        # Validate that the referenced backtest run exists, is completed, and
        # belongs to a strategy owned by this user
        run = session.exec(
            select(BacktestRun).where(BacktestRun.id == data.backtest_run_id)
        ).first()
        if not run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Backtest run not found"
            )
        if run.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Backtest run must be completed to create a performance alert",
            )

        strategy = session.exec(
            select(Strategy).where(
                Strategy.id == run.strategy_id,
                Strategy.user_id == user.id,
            )
        ).first()
        if not strategy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found"
            )

        # Re-pin if an active performance alert already exists for this strategy.
        # Deliberate re-pin (from a new backtest result) replaces the existing pin
        # rather than accumulating per-version duplicates.
        existing = session.exec(
            select(AlertRule).where(
                AlertRule.strategy_id == run.strategy_id,
                AlertRule.alert_type == AlertType.PERFORMANCE,
                AlertRule.is_active == True,  # noqa: E712
            )
        ).first()
        # Validate webhook URL to prevent SSRF
        if data.notify_webhook and data.webhook_url:
            validate_webhook_url(data.webhook_url)

        if existing:
            existing.strategy_version_id = run.strategy_version_id
            # Seed the watermark from the source run so the alert only fires on
            # trades on candles newer than the result the user pinned from —
            # never on historical entries/exits inside the backtest lookback.
            existing.last_fired_candle_ts = run.date_to
            # Apply the submitted configuration so re-pinning from a newer result
            # persists the user's chosen conditions instead of silently keeping
            # the previous pin's settings.
            existing.threshold_pct = data.threshold_pct
            existing.alert_on_entry = data.alert_on_entry
            existing.alert_on_exit = data.alert_on_exit
            existing.notify_email = data.notify_email
            existing.notify_webhook = data.notify_webhook
            existing.webhook_url = data.webhook_url
            existing.is_active = data.is_active
            existing.updated_at = datetime.now(timezone.utc)
            session.add(existing)
            session.commit()
            session.refresh(existing)
            response.status_code = status.HTTP_200_OK
            return _map_to_response(existing, _compute_is_stale(existing, session))

        # Create performance alert rule pinned to the exact strategy version.
        # Seed the watermark from the source run's date_to so the first
        # evaluation only considers trades on candles newer than the pinned
        # result — never historical entries/exits inside the backtest lookback.
        rule = AlertRule(
            user_id=user.id,
            alert_type=AlertType.PERFORMANCE,
            strategy_id=run.strategy_id,
            strategy_version_id=run.strategy_version_id,
            threshold_pct=data.threshold_pct,
            alert_on_entry=data.alert_on_entry,
            alert_on_exit=data.alert_on_exit,
            last_fired_candle_ts=run.date_to,
            notify_email=data.notify_email,
            notify_webhook=data.notify_webhook,
            webhook_url=data.webhook_url,
            is_active=data.is_active,
        )

    elif data.alert_type == AlertType.PRICE:
        # Validate webhook URL to prevent SSRF
        if data.notify_webhook and data.webhook_url:
            validate_webhook_url(data.webhook_url)

        # Create price alert rule (no duplicate check, multiple allowed per asset)
        rule = AlertRule(
            user_id=user.id,
            alert_type=AlertType.PRICE,
            asset=data.asset,
            direction=data.direction,
            threshold_price=data.threshold_price,
            notify_email=data.notify_email,
            notify_webhook=data.notify_webhook,
            webhook_url=data.webhook_url,
            expires_at=data.expires_at,
            is_active=data.is_active,
        )

    session.add(rule)
    session.commit()
    session.refresh(rule)

    return _map_to_response(rule, _compute_is_stale(rule, session))


@router.patch("/{alert_id}", response_model=AlertRuleResponse)
def update_alert(
    alert_id: UUID,
    data: AlertRuleUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> AlertRuleResponse:
    """Update an existing alert rule."""
    rule = get_user_alert_rule(alert_id, user, session)

    # Update fields based on alert type
    if rule.alert_type == AlertType.PERFORMANCE:
        if data.threshold_pct is not None:
            rule.threshold_pct = data.threshold_pct
        if data.alert_on_entry is not None:
            rule.alert_on_entry = data.alert_on_entry
        if data.alert_on_exit is not None:
            rule.alert_on_exit = data.alert_on_exit
        if data.notify_webhook is not None:
            rule.notify_webhook = data.notify_webhook
        if data.webhook_url is not None:
            validate_webhook_url(data.webhook_url)
            rule.webhook_url = data.webhook_url

    elif rule.alert_type == AlertType.PRICE:
        if data.threshold_price is not None:
            rule.threshold_price = data.threshold_price
        if data.notify_webhook is not None:
            rule.notify_webhook = data.notify_webhook
        if data.webhook_url is not None:
            # Validate webhook URL to prevent SSRF
            validate_webhook_url(data.webhook_url)
            rule.webhook_url = data.webhook_url
        if data.expires_at is not None:
            rule.expires_at = data.expires_at

    # Common fields
    if data.notify_email is not None:
        rule.notify_email = data.notify_email
    if data.is_active is not None:
        rule.is_active = data.is_active

    # Enforce the same cross-field invariant as creation: a webhook cannot be
    # enabled without a URL, otherwise the firing path silently never delivers.
    if rule.notify_webhook and not rule.webhook_url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="webhook_url required when notify_webhook is true",
        )

    rule.updated_at = datetime.now(timezone.utc)

    session.add(rule)
    session.commit()
    session.refresh(rule)

    return _map_to_response(rule, _compute_is_stale(rule, session))


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
