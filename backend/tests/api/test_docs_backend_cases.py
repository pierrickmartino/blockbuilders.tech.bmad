from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.models.strategy_tag_link import StrategyTagLink
from app.models.strategy_version import StrategyVersion


def _mock_market_dependencies(monkeypatch):
    class FakeRedis:
        def get(self, _key):
            return None

        def setex(self, _key, _ttl, _val):
            return None

    class DummyResp:
        def __init__(self, data):
            self._data = data

        def raise_for_status(self):
            return None

        def json(self):
            return self._data

    class DummyClient:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def get(self, url, params=None):
            if "pricemultifull" in url:
                return DummyResp({"RAW": {"BTC": {"USDT": {"PRICE": 50000, "CHANGEPCT24HOUR": 1.2, "VOLUME24HOURTO": 1}}}})
            if "fng" in url:
                return DummyResp({"data": [{"value": "60", "timestamp": "1710000000"}]})
            if "globalLongShort" in url:
                return DummyResp([{"longShortRatio": "1.2", "timestamp": 1710000000000}])
            if "fundingRate" in url:
                return DummyResp([{"fundingRate": "0.0001", "fundingTime": 1710000000000}])
            return DummyResp({})

    monkeypatch.setattr("app.api.market._get_redis", lambda: FakeRedis())
    monkeypatch.setattr("app.api.market.httpx.Client", lambda timeout=10.0: DummyClient())


@pytest.mark.parametrize(
    "payload,price_key",
    [
        ({"plan_tier": "pro", "interval": "annual"}, ("pro", "annual")),
        ({"plan_tier": "premium", "interval": "annual"}, ("premium", "annual")),
        ({"plan_tier": "pro", "interval": "monthly"}, ("pro", "monthly")),
    ],
)
def test_checkout_session_interval_uses_expected_price_id(client, auth_headers, monkeypatch, payload, price_key):
    from app.api.billing import PRICE_IDS

    monkeypatch.setattr("app.core.plans.get_plan_pricing", lambda *args, **kwargs: {"discount_percent": 0, "final_price": 1})
    monkeypatch.setitem(PRICE_IDS, ("pro", "annual"), "price_pro_annual")
    monkeypatch.setitem(PRICE_IDS, ("premium", "annual"), "price_premium_annual")
    monkeypatch.setitem(PRICE_IDS, ("pro", "monthly"), "price_pro_monthly")

    monkeypatch.setattr("app.api.billing.stripe.Customer.create", lambda **kwargs: SimpleNamespace(id="cus_test"))

    captured = {}

    def _fake_create(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(url="https://stripe.test/session")

    monkeypatch.setattr("app.api.billing.stripe.checkout.Session.create", _fake_create)

    response = client.post("/billing/checkout-session", headers=auth_headers, json=payload)

    assert response.status_code == 200
    assert captured["line_items"][0]["price"] == PRICE_IDS[price_key]


def test_strategy_endpoints_require_authentication(client, seeded_objects):
    strategy_id = seeded_objects["strategy"].id

    assert client.get("/strategies/").status_code == 401
    assert client.post("/strategies/", json={"name": "X", "asset": "BTC/USDT", "timeframe": "1d"}).status_code == 401
    assert client.patch(f"/strategies/{strategy_id}", json={"name": "Y"}).status_code == 401


def test_archived_strategy_filtered_from_default_list(client, auth_headers, seeded_objects):
    strategy_id = seeded_objects["strategy"].id

    archive = client.patch(f"/strategies/{strategy_id}", headers=auth_headers, json={"is_archived": True})
    assert archive.status_code == 200

    default_list = client.get("/strategies/", headers=auth_headers)
    include_archived = client.get("/strategies/?include_archived=true", headers=auth_headers)

    assert default_list.status_code == 200
    assert include_archived.status_code == 200
    assert all(item["id"] != str(strategy_id) for item in default_list.json())
    assert any(item["id"] == str(strategy_id) for item in include_archived.json())


def test_bulk_archive_endpoint_archives_and_reports_failures(client, auth_headers, seeded_objects):
    valid_id = str(seeded_objects["strategy"].id)
    invalid_id = str(uuid4())

    response = client.post(
        "/strategies/bulk/archive",
        headers=auth_headers,
        json={"strategy_ids": [valid_id, invalid_id]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success_count"] == 1
    assert body["failed_count"] == 1
    assert invalid_id in body["failed_ids"]



def test_bulk_tag_endpoint_links_tag_to_strategy_and_reports_failures(client, auth_headers, seeded_objects, session):
    strategy_id = seeded_objects["strategy"].id
    other_strategy = Strategy(id=uuid4(), user_id=uuid4(), name="Other", asset="BTC/USDT", timeframe="1d")
    session.add(other_strategy)
    session.commit()

    create_tag = client.post("/strategy-tags/", headers=auth_headers, json={"name": "swing"})
    assert create_tag.status_code == 201
    tag_id = create_tag.json()["id"]

    response = client.post(
        "/strategies/bulk/tag",
        headers=auth_headers,
        json={"strategy_ids": [str(strategy_id), str(other_strategy.id)], "tag_ids": [tag_id]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success_count"] == 1
    assert body["failed_count"] == 1

    # Query directly to assert link side effect
    linked_rows = session.query(StrategyTagLink).filter(StrategyTagLink.strategy_id == strategy_id).all()
    assert len(linked_rows) == 1
    assert str(linked_rows[0].tag_id) == tag_id



def test_bulk_delete_endpoint_deletes_and_reports_failures(client, auth_headers, seeded_objects):
    valid_id = str(seeded_objects["strategy"].id)
    invalid_id = str(uuid4())

    response = client.post(
        "/strategies/bulk/delete",
        headers=auth_headers,
        json={"strategy_ids": [valid_id, invalid_id]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success_count"] == 1
    assert body["failed_count"] == 1
    assert invalid_id in body["failed_ids"]

    assert client.get(f"/strategies/{valid_id}", headers=auth_headers).status_code == 404



def test_market_sentiment_and_backtest_sentiment_endpoints_return_valid_payload(client, auth_headers, seeded_objects, monkeypatch):
    _mock_market_dependencies(monkeypatch)

    sentiment = client.get("/market/sentiment", headers=auth_headers, params={"asset": "BTC/USDT"})
    assert sentiment.status_code == 200
    sentiment_body = sentiment.json()
    assert sentiment_body["asset"] == "BTC/USDT"
    assert "fear_greed" in sentiment_body

    backtest_sentiment = client.get(f"/backtests/{seeded_objects['run'].id}/sentiment", headers=auth_headers)
    assert backtest_sentiment.status_code == 200
    backtest_body = backtest_sentiment.json()
    assert "as_of" in backtest_body
    assert "source_status" in backtest_body



def test_share_link_auth_and_public_access_flow(client, auth_headers, seeded_objects, session):
    run_id = seeded_objects["run"].id

    unauth = client.post(f"/backtests/{run_id}/share-links", json={"expires_in_days": 7})
    assert unauth.status_code == 401

    missing = client.post(f"/backtests/{uuid4()}/share-links", headers=auth_headers, json={"expires_in_days": 7})
    assert missing.status_code == 404

    in_progress_run = BacktestRun(
        id=uuid4(),
        user_id=seeded_objects["run"].user_id,
        strategy_id=seeded_objects["run"].strategy_id,
        strategy_version_id=seeded_objects["run"].strategy_version_id,
        status="running",
        asset="BTC/USDT",
        timeframe="1d",
        date_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        date_to=datetime(2024, 1, 10, tzinfo=timezone.utc),
    )
    session.add(in_progress_run)
    session.commit()

    not_completed = client.post(f"/backtests/{in_progress_run.id}/share-links", headers=auth_headers, json={"expires_in_days": 7})
    assert not_completed.status_code == 400

    expires_at = datetime.now(timezone.utc) + timedelta(days=3)
    created = client.post(
        f"/backtests/{run_id}/share-links",
        headers=auth_headers,
        json={"expires_at": expires_at.isoformat()},
    )
    assert created.status_code == 200
    created_body = created.json()
    assert "/share/backtests/" in created_body["url"]
    assert len(created_body["token"]) >= 32
    assert created_body["expires_at"] is not None

    public = client.get(f"/backtests/share/{created_body['token']}")
    assert public.status_code == 200



def test_market_tickers_includes_as_of_and_volatility_fields(client, auth_headers, monkeypatch):
    _mock_market_dependencies(monkeypatch)

    response = client.get("/market/tickers", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert "as_of" in body
    assert isinstance(body["items"], list)
    assert {"pair", "price", "change_24h_pct", "volume_24h", "volatility_stddev", "volatility_atr_pct", "volatility_percentile_1y"}.issubset(body["items"][0].keys())
