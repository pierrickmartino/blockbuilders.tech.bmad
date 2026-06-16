"""Tests for GET /track endpoint."""
from uuid import uuid4

import pytest

from app.models.lesson_completion import LessonCompletion


# ── Auth guard ────────────────────────────────────────────────────────────────


def test_get_track_unauthenticated_returns_401(client):
    res = client.get("/track")
    assert res.status_code == 401


# ── Shape ─────────────────────────────────────────────────────────────────────


def test_get_track_returns_200_for_authed_user(client, auth_headers):
    res = client.get("/track", headers=auth_headers)
    assert res.status_code == 200


def test_get_track_response_has_required_top_level_fields(client, auth_headers):
    data = client.get("/track", headers=auth_headers).json()
    for field in ("modules", "total_lessons", "completed_lessons", "percent_complete", "resume_lesson_id"):
        assert field in data, f"missing field: {field}"


def test_get_track_modules_have_expected_shape(client, auth_headers):
    data = client.get("/track", headers=auth_headers).json()
    assert len(data["modules"]) == 3
    for module in data["modules"]:
        for field in ("id", "title", "order", "lessons", "completed_count", "total_count", "percent_complete"):
            assert field in module, f"module missing field: {field}"


def test_get_track_lessons_have_expected_shape(client, auth_headers):
    data = client.get("/track", headers=auth_headers).json()
    for module in data["modules"]:
        for lesson in module["lessons"]:
            for field in ("id", "title", "order", "completed"):
                assert field in lesson, f"lesson missing field: {field}"


# ── Zero completions ──────────────────────────────────────────────────────────


def test_get_track_zero_completions_overall_is_zero(client, auth_headers):
    data = client.get("/track", headers=auth_headers).json()
    assert data["percent_complete"] == 0.0
    assert data["completed_lessons"] == 0
    assert data["total_lessons"] == 12


def test_get_track_zero_completions_resume_is_first_lesson(client, auth_headers):
    data = client.get("/track", headers=auth_headers).json()
    assert data["resume_lesson_id"] == "lesson-1-rsi"


# ── With completions ──────────────────────────────────────────────────────────


def test_get_track_reflects_existing_completions(client, auth_headers, session, user):
    completion = LessonCompletion(user_id=user.id, lesson_id="lesson-1-rsi")
    session.add(completion)
    session.commit()

    data = client.get("/track", headers=auth_headers).json()

    assert data["completed_lessons"] == 1
    assert data["resume_lesson_id"] == "lesson-2-ma-crossover"

    module_1 = next(m for m in data["modules"] if m["id"] == "module-1-foundations")
    rsi = next(l for l in module_1["lessons"] if l["id"] == "lesson-1-rsi")
    assert rsi["completed"] is True


def test_get_track_only_shows_current_users_completions(client, auth_headers, session, user):
    other_user_id = uuid4()
    completion = LessonCompletion(user_id=other_user_id, lesson_id="lesson-1-rsi")
    session.add(completion)
    session.commit()

    data = client.get("/track", headers=auth_headers).json()

    assert data["completed_lessons"] == 0
