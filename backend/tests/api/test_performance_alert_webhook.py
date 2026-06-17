"""API tests: webhook fields on performance alerts (create + update)."""
import pytest


def test_create_performance_alert_with_webhook(client, auth_headers, seeded_objects):
    run = seeded_objects["run"]

    with pytest.MonkeyPatch().context() as mp:
        mp.setattr("app.api.alerts.validate_webhook_url", lambda url: None)
        res = client.post(
            "/alerts/",
            json={
                "alert_type": "performance",
                "backtest_run_id": str(run.id),
                "alert_on_entry": True,
                "notify_webhook": True,
                "webhook_url": "https://example.com/hook",
            },
            headers=auth_headers,
        )

    assert res.status_code in (200, 201), res.text
    body = res.json()
    assert body["notify_webhook"] is True
    assert body["webhook_url"] == "https://example.com/hook"


def test_create_performance_alert_rejects_http_webhook(client, auth_headers, seeded_objects):
    run = seeded_objects["run"]

    res = client.post(
        "/alerts/",
        json={
            "alert_type": "performance",
            "backtest_run_id": str(run.id),
            "alert_on_entry": True,
            "notify_webhook": True,
            "webhook_url": "http://example.com/hook",
        },
        headers=auth_headers,
    )

    assert res.status_code == 400
    assert "HTTPS" in res.json()["detail"]


def test_update_performance_alert_enables_webhook(client, auth_headers, seeded_objects):
    run = seeded_objects["run"]

    # Create without webhook
    res = client.post(
        "/alerts/",
        json={
            "alert_type": "performance",
            "backtest_run_id": str(run.id),
            "alert_on_entry": True,
        },
        headers=auth_headers,
    )
    assert res.status_code in (200, 201), res.text
    alert_id = res.json()["id"]

    # Enable webhook
    with pytest.MonkeyPatch().context() as mp:
        mp.setattr("app.api.alerts.validate_webhook_url", lambda url: None)
        patch_res = client.patch(
            f"/alerts/{alert_id}",
            json={
                "notify_webhook": True,
                "webhook_url": "https://example.com/hook",
            },
            headers=auth_headers,
        )

    assert patch_res.status_code == 200, patch_res.text
    body = patch_res.json()
    assert body["notify_webhook"] is True
    assert body["webhook_url"] == "https://example.com/hook"
