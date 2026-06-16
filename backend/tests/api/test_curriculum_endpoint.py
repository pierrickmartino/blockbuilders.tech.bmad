"""Tests for GET /curriculum endpoint."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_curriculum_returns_200():
    res = client.get("/curriculum")
    assert res.status_code == 200


def test_curriculum_response_shape():
    res = client.get("/curriculum")
    body = res.json()
    assert "modules" in body
    assert len(body["modules"]) >= 1

    module = body["modules"][0]
    assert "id" in module
    assert "title" in module
    assert "order" in module
    assert "lessons" in module
    assert len(module["lessons"]) >= 1

    lesson = module["lessons"][0]
    assert "id" in lesson
    assert "title" in lesson
    assert "template_name" in lesson
    assert "difficulty" in lesson
    assert "order" in lesson


def test_curriculum_lessons_reference_seed_templates():
    res = client.get("/curriculum")
    body = res.json()
    all_template_names = {
        lesson["template_name"]
        for module in body["modules"]
        for lesson in module["lessons"]
    }
    seed_names = {"RSI Oversold Bounce", "MA Crossover", "Bollinger Breakout"}
    assert all_template_names.issubset(seed_names)
