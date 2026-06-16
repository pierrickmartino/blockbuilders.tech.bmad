"""Tests for curriculum registry well-formedness validation."""

from app.data.curriculum_registry import CURRICULUM
from app.data.strategy_templates import TEMPLATES
from app.services.curriculum_validation import validate_registry

KNOWN_TEMPLATES = {"RSI Oversold Bounce", "MA Crossover", "Bollinger Breakout"}

VALID_REGISTRY = {
    "modules": [
        {
            "id": "module-1-foundations",
            "title": "Foundations",
            "order": 1,
            "lessons": [
                {
                    "id": "lesson-1-rsi",
                    "title": "RSI Oversold Bounce",
                    "template_name": "RSI Oversold Bounce",
                    "difficulty": "beginner",
                    "order": 1,
                },
                {
                    "id": "lesson-2-ma",
                    "title": "MA Crossover",
                    "template_name": "MA Crossover",
                    "difficulty": "beginner",
                    "order": 2,
                },
                {
                    "id": "lesson-3-bollinger",
                    "title": "Bollinger Breakout",
                    "template_name": "Bollinger Breakout",
                    "difficulty": "intermediate",
                    "order": 3,
                },
            ],
        }
    ]
}


def test_valid_registry_passes():
    validate_registry(VALID_REGISTRY, KNOWN_TEMPLATES)  # must not raise


def test_missing_template_fails():
    registry = {
        "modules": [
            {
                "id": "module-1-foundations",
                "title": "Foundations",
                "order": 1,
                "lessons": [
                    {
                        "id": "lesson-x",
                        "title": "Unknown",
                        "template_name": "Nonexistent Template",
                        "difficulty": "beginner",
                        "order": 1,
                    }
                ],
            }
        ]
    }
    try:
        validate_registry(registry, KNOWN_TEMPLATES)
        assert False, "Expected ValueError"
    except ValueError as exc:
        assert "Nonexistent Template" in str(exc)


def test_duplicate_lesson_order_in_module_fails():
    registry = {
        "modules": [
            {
                "id": "module-1-foundations",
                "title": "Foundations",
                "order": 1,
                "lessons": [
                    {
                        "id": "lesson-1-rsi",
                        "title": "RSI",
                        "template_name": "RSI Oversold Bounce",
                        "difficulty": "beginner",
                        "order": 1,
                    },
                    {
                        "id": "lesson-2-ma",
                        "title": "MA",
                        "template_name": "MA Crossover",
                        "difficulty": "beginner",
                        "order": 1,  # duplicate
                    },
                ],
            }
        ]
    }
    try:
        validate_registry(registry, KNOWN_TEMPLATES)
        assert False, "Expected ValueError"
    except ValueError as exc:
        assert "order" in str(exc).lower()


def test_duplicate_template_assignment_fails():
    registry = {
        "modules": [
            {
                "id": "module-1-foundations",
                "title": "Foundations",
                "order": 1,
                "lessons": [
                    {
                        "id": "lesson-1-rsi",
                        "title": "RSI A",
                        "template_name": "RSI Oversold Bounce",
                        "difficulty": "beginner",
                        "order": 1,
                    },
                    {
                        "id": "lesson-2-rsi-dup",
                        "title": "RSI B",
                        "template_name": "RSI Oversold Bounce",  # duplicate
                        "difficulty": "beginner",
                        "order": 2,
                    },
                ],
            }
        ]
    }
    try:
        validate_registry(registry, KNOWN_TEMPLATES)
        assert False, "Expected ValueError"
    except ValueError as exc:
        assert "RSI Oversold Bounce" in str(exc)


def test_duplicate_module_order_fails():
    registry = {
        "modules": [
            {
                "id": "module-1",
                "title": "Module 1",
                "order": 1,
                "lessons": [
                    {
                        "id": "lesson-1",
                        "title": "RSI",
                        "template_name": "RSI Oversold Bounce",
                        "difficulty": "beginner",
                        "order": 1,
                    }
                ],
            },
            {
                "id": "module-2",
                "title": "Module 2",
                "order": 1,  # duplicate
                "lessons": [
                    {
                        "id": "lesson-2",
                        "title": "MA",
                        "template_name": "MA Crossover",
                        "difficulty": "beginner",
                        "order": 1,
                    }
                ],
            },
        ]
    }
    try:
        validate_registry(registry, KNOWN_TEMPLATES)
        assert False, "Expected ValueError"
    except ValueError as exc:
        assert "order" in str(exc).lower()


# ---------------------------------------------------------------------------
# Full-curriculum structural tests (RED until 3-module arc is implemented)
# ---------------------------------------------------------------------------

_ALL_TEMPLATE_NAMES = {t["name"] for t in TEMPLATES}


def test_curriculum_has_three_modules():
    assert len(CURRICULUM["modules"]) == 3


def test_curriculum_has_twelve_lessons():
    total = sum(len(m["lessons"]) for m in CURRICULUM["modules"])
    assert total == 12


def test_module_1_id_and_order():
    m = CURRICULUM["modules"][0]
    assert m["id"] == "module-1-foundations"
    assert m["order"] == 1


def test_module_2_id_and_order():
    m = CURRICULUM["modules"][1]
    assert m["id"] == "module-2-risk-drawdown"
    assert m["order"] == 2


def test_module_3_id_and_order():
    m = CURRICULUM["modules"][2]
    assert m["id"] == "module-3-playbook"
    assert m["order"] == 3


def test_module_1_has_four_lessons():
    m = next(m for m in CURRICULUM["modules"] if m["id"] == "module-1-foundations")
    assert len(m["lessons"]) == 4


def test_module_2_has_four_lessons():
    m = next(m for m in CURRICULUM["modules"] if m["id"] == "module-2-risk-drawdown")
    assert len(m["lessons"]) == 4


def test_module_3_has_four_lessons():
    m = next(m for m in CURRICULUM["modules"] if m["id"] == "module-3-playbook")
    assert len(m["lessons"]) == 4


def test_all_lesson_template_names_exist_in_TEMPLATES():
    for module in CURRICULUM["modules"]:
        for lesson in module["lessons"]:
            assert lesson["template_name"] in _ALL_TEMPLATE_NAMES, (
                f"Lesson {lesson['id']!r} references unknown template {lesson['template_name']!r}"
            )


def test_lesson_orders_are_unique_within_each_module():
    for module in CURRICULUM["modules"]:
        orders = [l["order"] for l in module["lessons"]]
        assert len(orders) == len(set(orders)), f"Duplicate lesson orders in {module['id']!r}"


def test_module_lesson_ids_are_globally_unique():
    seen = set()
    for module in CURRICULUM["modules"]:
        for lesson in module["lessons"]:
            assert lesson["id"] not in seen, f"Duplicate lesson id {lesson['id']!r}"
            seen.add(lesson["id"])


def test_all_literacy_templates_exist_in_TEMPLATES():
    expected = {
        "RSI Oversold Bounce",
        "MA Crossover",
        "Bollinger Breakout",
        "EMA Trend Following",
        "MACD Histogram Cross",
        "Stochastic Oversold Bounce",
        "ADX Directional Filter",
        "Price Variation Momentum",
        "Stochastic + RSI Double Oversold",
        "Bollinger + RSI Reversal",
        "EMA + RSI Confirmation",
        "MACD + ADX Dual Filter",
    }
    for name in expected:
        assert name in _ALL_TEMPLATE_NAMES, f"Template {name!r} missing from TEMPLATES"
