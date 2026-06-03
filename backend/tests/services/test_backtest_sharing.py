"""Tests for backtest sharing service — stateful operations using session fixture."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlmodel import Session, select

from app.models.backtest_run import BacktestRun
from app.models.shared_backtest_link import SharedBacktestLink
from app.services.backtest_sharing import (
    build_share_url,
    create_share_link,
    resolve_share_link,
)
from app.services.exceptions import (
    ShareExpirationInvalid,
    ShareLinkExpired,
    ShareLinkNotFound,
)


def _make_run(session: Session) -> BacktestRun:
    run = BacktestRun(
        user_id=uuid4(),
        strategy_id=uuid4(),
        strategy_version_id=uuid4(),
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 3, 31, tzinfo=timezone.utc),
        status="completed",
        initial_balance=10000.0,
        total_return=15.0,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


class TestCreateShareLink:
    def test_happy_path_with_expiration(self, session: Session):
        run = _make_run(session)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        link = create_share_link(run, expires_at, session)
        assert link.token is not None
        assert len(link.token) > 0
        assert link.backtest_run_id == run.id
        assert link.expires_at is not None

    def test_happy_path_no_expiration(self, session: Session):
        run = _make_run(session)
        link = create_share_link(run, None, session)
        assert link.token is not None
        assert link.expires_at is None

    def test_past_expiration_raises(self, session: Session):
        run = _make_run(session)
        past = datetime.now(timezone.utc) - timedelta(hours=1)
        with pytest.raises(ShareExpirationInvalid):
            create_share_link(run, past, session)

    def test_link_is_persisted(self, session: Session):
        run = _make_run(session)
        link = create_share_link(run, None, session)
        found = session.exec(
            select(SharedBacktestLink).where(SharedBacktestLink.token == link.token)
        ).first()
        assert found is not None

    def test_token_is_urlsafe_and_unique(self, session: Session):
        run = _make_run(session)
        link1 = create_share_link(run, None, session)
        link2 = create_share_link(run, None, session)
        assert link1.token != link2.token


class TestResolveShareLink:
    def test_happy_path(self, session: Session):
        run = _make_run(session)
        link = create_share_link(run, None, session)
        resolved = resolve_share_link(link.token, session)
        assert resolved.token == link.token

    def test_missing_token_raises(self, session: Session):
        with pytest.raises(ShareLinkNotFound):
            resolve_share_link("nonexistent-token-xyz", session)

    def test_expired_token_raises(self, session: Session):
        run = _make_run(session)
        expired_link = SharedBacktestLink(
            backtest_run_id=run.id,
            token="expired-token-abc",
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        session.add(expired_link)
        session.commit()
        with pytest.raises(ShareLinkExpired):
            resolve_share_link("expired-token-abc", session)

    def test_naive_timestamp_normalized_and_detected_as_expired(self, session: Session):
        run = _make_run(session)
        naive_past = datetime.utcnow() - timedelta(hours=2)  # naive, in the past
        expired_link = SharedBacktestLink(
            backtest_run_id=run.id,
            token="naive-expired-token",
            expires_at=naive_past,
        )
        session.add(expired_link)
        session.commit()
        with pytest.raises(ShareLinkExpired):
            resolve_share_link("naive-expired-token", session)

    def test_not_expired_link_returns_it(self, session: Session):
        run = _make_run(session)
        future = datetime.now(timezone.utc) + timedelta(days=30)
        link = create_share_link(run, future, session)
        resolved = resolve_share_link(link.token, session)
        assert resolved.backtest_run_id == run.id


class TestBuildShareUrl:
    def test_with_configured_frontend_url(self, monkeypatch):
        from app.core import config

        monkeypatch.setattr(config.settings, "frontend_url", "https://app.example.com")
        url = build_share_url("abc123")
        assert url == "https://app.example.com/share/backtests/abc123"

    def test_fallback_when_no_frontend_url(self, monkeypatch):
        from app.core import config

        monkeypatch.setattr(config.settings, "frontend_url", None)
        url = build_share_url("abc123")
        assert url == "http://localhost:3000/share/backtests/abc123"
