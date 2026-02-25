from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import select

from app.models.shared_backtest_link import SharedBacktestLink


def _mock_backtest_storage(monkeypatch):
    def fake_download_json(key):
        if key == "trades.json":
            return [{
                "entry_time": "2024-01-02T00:00:00Z",
                "entry_price": 100,
                "exit_time": "2024-01-03T00:00:00Z",
                "exit_price": 110,
                "side": "long",
                "pnl": 10,
                "qty": 1,
            }]
        return [{"timestamp": "2024-01-01T00:00:00Z", "equity": 10000}]

    monkeypatch.setattr("app.api.backtests.download_json", fake_download_json)


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/health"),
        ("post", "/auth/signup"),
        ("post", "/auth/login"),
    ],
)
def test_public_endpoints_from_docs(client, method, path):
    payload = {"email": "new@example.com", "password": "CorrectPassword123!"}
    if path.endswith("/login"):
        client.post("/auth/signup", json=payload)
    response = getattr(client, method)(path, json=payload) if method == "post" else getattr(client, method)(path)
    assert response.status_code in {200, 201, 400, 422}


def test_users_me_get_put(client, auth_headers):
    get_r = client.get("/users/me", headers=auth_headers)
    assert get_r.status_code == 200
    put_r = client.put("/users/me", headers=auth_headers, json={"default_fee_percent": 0.1})
    assert put_r.status_code == 200


def test_strategy_endpoints(client, auth_headers, seeded_objects):
    sid = seeded_objects["strategy"].id
    r = client.get("/strategies/", headers=auth_headers)
    assert r.status_code == 200
    assert client.patch(f"/strategies/{sid}", headers=auth_headers, json={"name": "renamed"}).status_code == 200
    assert client.post(f"/strategies/{sid}/duplicate", headers=auth_headers).status_code == 201
    assert client.get(f"/strategies/{sid}/versions", headers=auth_headers).status_code == 200
    assert client.get(f"/strategies/{sid}/versions/1", headers=auth_headers).status_code == 200
    assert client.post(f"/strategies/{sid}/validate", headers=auth_headers, json={"blocks": [], "connections": []}).status_code == 200


def test_backtest_endpoints(client, auth_headers, seeded_objects, session, monkeypatch):
    _mock_backtest_storage(monkeypatch)
    run_id = seeded_objects["run"].id
    sid = seeded_objects["strategy"].id

    class FakeQueue:
        def enqueue(self, *args, **kwargs):
            return None

    monkeypatch.setattr("app.api.backtests.get_redis_queue", lambda: FakeQueue())
    create = client.post("/backtests/", headers=auth_headers, json={
        "strategy_id": str(sid),
        "date_from": "2024-01-01T00:00:00Z",
        "date_to": "2024-01-10T00:00:00Z",
    })
    assert create.status_code == 201
    assert client.get(f"/backtests/{run_id}", headers=auth_headers).status_code == 200
    assert client.get(f"/backtests/{run_id}/trades", headers=auth_headers).status_code == 200
    assert client.get(f"/backtests/{run_id}/trades/0", headers=auth_headers).status_code == 200
    assert client.get(f"/backtests/{run_id}/benchmark-equity-curve", headers=auth_headers).status_code == 200
    assert client.post("/backtests/compare", headers=auth_headers, json={"run_ids": [str(run_id)]}).status_code in {200, 400}

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    share = client.post(
        f"/backtests/{run_id}/share-links",
        headers=auth_headers,
        json={"expires_at": expires_at.isoformat()},
    )
    assert share.status_code == 200
    payload = share.json()
    token = payload["token"]
    assert payload["expires_at"] is not None

    link = session.exec(
        select(SharedBacktestLink).where(SharedBacktestLink.token == token)
    ).first()
    assert link is not None
    assert link.expires_at is not None

    stored_expires_at = link.expires_at
    if stored_expires_at.tzinfo is None:
        stored_expires_at = stored_expires_at.replace(tzinfo=timezone.utc)
    returned_expires_at = datetime.fromisoformat(payload["expires_at"].replace("Z", "+00:00"))
    if returned_expires_at.tzinfo is None:
        returned_expires_at = returned_expires_at.replace(tzinfo=timezone.utc)
    assert abs((stored_expires_at - returned_expires_at).total_seconds()) < 1

    assert client.get(f"/backtests/share/{token}").status_code == 200


def test_other_domain_endpoints(client, auth_headers, seeded_objects, monkeypatch):
    nid = seeded_objects["notification"].id
    tid = seeded_objects["template"].id

    assert client.get("/notifications/", headers=auth_headers).status_code == 200
    assert client.post(f"/notifications/{nid}/acknowledge", headers=auth_headers).status_code == 204
    assert client.post("/notifications/acknowledge-all", headers=auth_headers).status_code == 204

    assert client.get("/usage/me", headers=auth_headers).status_code == 200
    assert client.get("/progress", headers=auth_headers).status_code == 200

    assert client.get("/strategy-templates/", headers=auth_headers).status_code == 200
    assert client.get(f"/strategy-templates/{tid}", headers=auth_headers).status_code == 200
    assert client.post(f"/strategy-templates/{tid}/clone", headers=auth_headers).status_code == 201

    assert client.get("/strategy-tags/", headers=auth_headers).status_code == 200
    tag = client.post("/strategy-tags/", headers=auth_headers, json={"name": "swing"})
    assert tag.status_code == 201
    assert client.delete(f"/strategy-tags/{tag.json()['id']}", headers=auth_headers).status_code == 204

    assert client.get("/alerts/", headers=auth_headers).status_code == 200
    a = client.post("/alerts/", headers=auth_headers, json={"alert_type": "price", "asset": "BTC/USDT", "direction": "above", "threshold_price": "50000"})
    assert a.status_code == 201
    aid = a.json()["id"]
    assert client.patch(f"/alerts/{aid}", headers=auth_headers, json={"is_active": False}).status_code == 200
    assert client.delete(f"/alerts/{aid}", headers=auth_headers).status_code == 204


    class FakeRedis:
        def get(self, key): return None
        def setex(self, key, ttl, val): return None
    monkeypatch.setattr("app.api.market._get_redis", lambda: FakeRedis())

    class DummyResp:
        def __init__(self, data): self._data = data
        def raise_for_status(self): return None
        def json(self): return self._data
    class DummyClient:
        def __enter__(self): return self
        def __exit__(self, *args): return False
        def get(self, url, params=None):
            if "pricemultifull" in url: return DummyResp({"RAW": {"BTC": {"USDT": {"PRICE": 50000, "CHANGEPCT24HOUR": 1.2, "MKTCAP": 1, "VOLUME24HOURTO": 1}}}})
            if "fng" in url: return DummyResp({"data": [{"value": "60", "timestamp": "1710000000"}]})
            if "globalLongShort" in url: return DummyResp([{"longShortRatio": "1.2", "timestamp": 1710000000000}])
            if "fundingRate" in url: return DummyResp([{"fundingRate": "0.0001", "fundingTime": 1710000000000}])
            return DummyResp({})
    monkeypatch.setattr("app.api.market.httpx.Client", lambda timeout=10.0: DummyClient())
    assert client.get("/market/sentiment", headers=auth_headers, params={"asset": "BTC/USDT"}).status_code == 200
    assert client.get("/market/tickers", headers=auth_headers).status_code == 200

    assert client.get("/profiles/me/settings", headers=auth_headers).status_code == 200
    assert client.put("/profiles/me/settings", headers=auth_headers, json={"display_name": "tester"}).status_code == 200


def test_documented_path_mismatches_are_not_implemented(client, auth_headers, seeded_objects):
    run_id = seeded_objects["run"].id
    assert client.get("/backtests/{run_id}/details", headers=auth_headers).status_code == 404
    assert client.get("/share/backtests/some-token").status_code == 404
    assert client.get(f"/data-quality", headers=auth_headers).status_code == 404
    assert client.get(f"/data-completeness").status_code == 404
    assert client.get("/profiles/me", headers=auth_headers).status_code == 404
