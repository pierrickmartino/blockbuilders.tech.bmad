"""Tests for the /progress endpoint — milestone naming."""
import pytest

from app.schemas.progress import (
    AchievementsResponse,
    MilestoneItem,
    MilestonesResponse,
    ProgressResponse,
)


def test_schema_imports():
    """MilestoneItem and MilestonesResponse exist and are importable."""
    item = MilestoneItem(key="first_strategy", label="Created first strategy", done=True)
    assert item.key == "first_strategy"
    assert item.done is True

    resp = MilestonesResponse(
        total=4,
        completed=2,
        items=[item],
    )
    assert resp.total == 4


def test_progress_response_has_milestones_field():
    """ProgressResponse uses 'milestones', not 'lessons'."""
    resp = ProgressResponse(
        strategies_count=1,
        strategy_versions_count=1,
        completed_backtests_count=1,
        milestones=MilestonesResponse(total=4, completed=4, items=[]),
        achievements=AchievementsResponse(total=4, unlocked=0, latest=None),
        next_steps=[],
    )
    assert hasattr(resp, "milestones")
    assert not hasattr(resp, "lessons")


def test_progress_endpoint_returns_milestones_key(client, auth_headers):
    """GET /progress response JSON contains 'milestones', not 'lessons'."""
    res = client.get("/progress", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "milestones" in data
    assert "lessons" not in data


def test_progress_milestones_shape(client, auth_headers):
    """The milestones object has total, completed, items."""
    res = client.get("/progress", headers=auth_headers)
    milestones = res.json()["milestones"]
    assert "total" in milestones
    assert "completed" in milestones
    assert "items" in milestones


def test_progress_milestone_items_have_expected_keys(client, auth_headers, seeded_objects):
    """Each milestone item has key, label, done; computation is unchanged."""
    res = client.get("/progress", headers=auth_headers)
    items = res.json()["milestones"]["items"]
    assert len(items) == 4
    for item in items:
        assert "key" in item
        assert "label" in item
        assert "done" in item

    keys = {i["key"] for i in items}
    assert keys == {"first_strategy", "saved_version", "first_backtest", "reviewed_results"}
