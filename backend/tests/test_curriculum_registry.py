"""Tests for curriculum registry well-formedness validation."""

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
