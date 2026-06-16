"""Tests for GET /curriculum endpoint."""


def test_curriculum_returns_200(client):
    res = client.get("/curriculum")
    assert res.status_code == 200


def test_curriculum_response_shape(client):
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


def test_curriculum_lessons_have_non_empty_template_names(client):
    res = client.get("/curriculum")
    body = res.json()
    for module in body["modules"]:
        for lesson in module["lessons"]:
            assert lesson["template_name"], "Every lesson must reference a template name"


def test_curriculum_lessons_include_template_id_field(client):
    """Each lesson exposes template_id so the frontend can call the clone API."""
    res = client.get("/curriculum")
    body = res.json()
    lesson = body["modules"][0]["lessons"][0]
    assert "template_id" in lesson


def test_curriculum_lesson_template_id_resolves_when_template_is_seeded(client, session):
    """template_id is a non-null UUID string when the template exists in the DB."""
    from uuid import uuid4
    from app.models.strategy_template import StrategyTemplate

    template = StrategyTemplate(
        id=uuid4(),
        name="RSI Oversold Bounce",
        description="d",
        logic_summary="l",
        use_cases=[],
        parameter_ranges={},
        definition_json={},
        asset="BTC/USDT",
        timeframe="1d",
    )
    session.add(template)
    session.commit()

    res = client.get("/curriculum")
    body = res.json()
    rsi_lesson = body["modules"][0]["lessons"][0]
    assert rsi_lesson["template_name"] == "RSI Oversold Bounce"
    assert rsi_lesson["template_id"] == str(template.id)


def test_curriculum_lesson_template_id_is_null_when_template_not_seeded(client):
    """template_id is None when the template is not in the DB."""
    res = client.get("/curriculum")
    body = res.json()
    lesson = body["modules"][0]["lessons"][0]
    assert lesson["template_id"] is None
