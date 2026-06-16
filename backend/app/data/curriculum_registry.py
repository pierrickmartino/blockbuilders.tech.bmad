"""Static curriculum registry for the Literacy track.

Module 1 — Foundations covers all three seed templates, ordered by difficulty.
"""

from app.data.strategy_templates import TEMPLATES

CURRICULUM: dict = {
    "modules": [
        {
            "id": "module-1-foundations",
            "title": "Foundations",
            "description": "Learn the three core strategy patterns that every block-builder starts with.",
            "order": 1,
            "lessons": [
                {
                    "id": "lesson-1-rsi",
                    "title": "RSI Oversold Bounce",
                    "description": "Understand momentum indicators and how oversold/overbought zones signal reversals.",
                    "template_name": "RSI Oversold Bounce",
                    "difficulty": "beginner",
                    "order": 1,
                },
                {
                    "id": "lesson-2-ma-crossover",
                    "title": "MA Crossover",
                    "description": "Learn how moving average crossovers identify trend changes.",
                    "template_name": "MA Crossover",
                    "difficulty": "beginner",
                    "order": 2,
                },
                {
                    "id": "lesson-3-bollinger-breakout",
                    "title": "Bollinger Breakout",
                    "description": "Explore volatility bands and breakout-based entry signals.",
                    "template_name": "Bollinger Breakout",
                    "difficulty": "intermediate",
                    "order": 3,
                },
            ],
        }
    ]
}

# Validate at module load time so misconfiguration is caught on startup.
_KNOWN_TEMPLATE_NAMES: set[str] = {t["name"] for t in TEMPLATES}

from app.services.curriculum_validation import validate_registry  # noqa: E402

validate_registry(CURRICULUM, _KNOWN_TEMPLATE_NAMES)
