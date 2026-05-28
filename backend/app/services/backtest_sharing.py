"""Stateful sharing operations for backtest share links."""
from __future__ import annotations

import secrets
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.core.config import settings
from app.models.backtest_run import BacktestRun
from app.models.shared_backtest_link import SharedBacktestLink
from app.services.exceptions import (
    ShareExpirationInvalid,
    ShareLinkExpired,
    ShareLinkNotFound,
)


def create_share_link(
    run: BacktestRun,
    expires_at: datetime | None,
    session: Session,
) -> SharedBacktestLink:
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            raise ShareExpirationInvalid()

    token = secrets.token_urlsafe(32)
    link = SharedBacktestLink(
        backtest_run_id=run.id,
        token=token,
        expires_at=expires_at,
    )
    session.add(link)
    session.commit()
    session.refresh(link)
    return link


def resolve_share_link(token: str, session: Session) -> SharedBacktestLink:
    link = session.exec(
        select(SharedBacktestLink).where(SharedBacktestLink.token == token)
    ).first()

    if not link:
        raise ShareLinkNotFound()

    if link.expires_at is not None:
        expires_at = link.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise ShareLinkExpired()

    return link


def build_share_url(token: str) -> str:
    frontend_url = settings.frontend_url or "http://localhost:3000"
    return f"{frontend_url}/share/backtests/{token}"
