"""Tests for the shared post_webhook delivery helper."""
from unittest.mock import MagicMock, patch

import pytest

from app.worker.jobs import post_webhook


_URL = "https://example.com/webhook"
_PAYLOAD = {"type": "performance_alert", "event": "entry"}


def test_post_webhook_posts_to_url():
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None

    mock_client = MagicMock()
    mock_client.__enter__ = lambda s: mock_client
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.post.return_value = mock_response

    with patch("app.worker.jobs.httpx.Client", return_value=mock_client):
        post_webhook(_URL, _PAYLOAD)

    mock_client.post.assert_called_once_with(
        _URL,
        json=_PAYLOAD,
        headers={"Content-Type": "application/json"},
    )


def test_post_webhook_uses_follow_redirects_false():
    """follow_redirects must be False to prevent SSRF bypass via redirect."""
    captured_kwargs: dict = {}

    def fake_client(**kwargs):
        captured_kwargs.update(kwargs)
        m = MagicMock()
        m.__enter__ = lambda s: m
        m.__exit__ = MagicMock(return_value=False)
        m.post.return_value = MagicMock()
        return m

    with patch("app.worker.jobs.httpx.Client", side_effect=fake_client):
        post_webhook(_URL, _PAYLOAD)

    assert captured_kwargs.get("follow_redirects") is False


def test_post_webhook_uses_10s_timeout():
    captured_kwargs: dict = {}

    def fake_client(**kwargs):
        captured_kwargs.update(kwargs)
        m = MagicMock()
        m.__enter__ = lambda s: m
        m.__exit__ = MagicMock(return_value=False)
        m.post.return_value = MagicMock()
        return m

    with patch("app.worker.jobs.httpx.Client", side_effect=fake_client):
        post_webhook(_URL, _PAYLOAD)

    assert captured_kwargs.get("timeout") == 10.0


def test_post_webhook_swallows_transport_error(caplog):
    """Transport errors must not propagate — fire-and-forget semantics."""
    import httpx

    def raise_transport(*args, **kwargs):
        raise httpx.TransportError("connection refused")

    mock_client = MagicMock()
    mock_client.__enter__ = lambda s: mock_client
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.post.side_effect = raise_transport

    with patch("app.worker.jobs.httpx.Client", return_value=mock_client):
        post_webhook(_URL, _PAYLOAD)  # must not raise


def test_post_webhook_swallows_non_2xx(caplog):
    """Non-2xx responses are logged but do not raise."""
    import httpx

    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "400", request=MagicMock(), response=MagicMock()
    )

    mock_client = MagicMock()
    mock_client.__enter__ = lambda s: mock_client
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.post.return_value = mock_response

    with patch("app.worker.jobs.httpx.Client", return_value=mock_client):
        post_webhook(_URL, _PAYLOAD)  # must not raise
