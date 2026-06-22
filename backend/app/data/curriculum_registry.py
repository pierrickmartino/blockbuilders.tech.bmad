"""Static curriculum registry for the Literacy track.

Three-module arc: Foundations → Risk & Drawdown → Playbook.
Each module holds four lessons, each mapped 1:1 to a literacy template.
"""

from app.data.strategy_templates import TEMPLATES

CURRICULUM: dict = {
    "modules": [
        {
            "id": "module-1-foundations",
            "title": "Foundations",
            "description": "Build intuition for the three core strategy patterns every block-builder starts with, then sharpen it with EMA.",
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
                {
                    "id": "lesson-4-ema-trend",
                    "title": "EMA Trend Following",
                    "description": "Compare EMA vs SMA crossover speed and discover the lag trade-off.",
                    "template_name": "EMA Trend Following",
                    "difficulty": "intermediate",
                    "order": 4,
                },
            ],
        },
        {
            "id": "module-2-risk-drawdown",
            "title": "Risk & Drawdown",
            "description": "Study momentum oscillators, directional filters, and raw price-change signals to understand how indicators behave under drawdown conditions.",
            "order": 2,
            "lessons": [
                {
                    "id": "lesson-5-macd-histogram",
                    "title": "MACD Histogram Cross",
                    "description": "Learn how MACD histogram crossing zero signals momentum shifts.",
                    "template_name": "MACD Histogram Cross",
                    "difficulty": "intermediate",
                    "order": 1,
                },
                {
                    "id": "lesson-6-stochastic-oversold",
                    "title": "Stochastic Oversold Bounce",
                    "description": "Discover range-based oscillators and compare their signals to RSI.",
                    "template_name": "Stochastic Oversold Bounce",
                    "difficulty": "intermediate",
                    "order": 2,
                },
                {
                    "id": "lesson-7-adx-directional",
                    "title": "ADX Directional Filter",
                    "description": "Use +DI vs -DI to trade pure directional bias without a strength filter.",
                    "template_name": "ADX Directional Filter",
                    "difficulty": "intermediate",
                    "order": 3,
                },
                {
                    "id": "lesson-8-price-variation",
                    "title": "Price Variation Momentum",
                    "description": "Trade raw daily returns — the noisiest but most immediate momentum signal.",
                    "template_name": "Price Variation Momentum",
                    "difficulty": "intermediate",
                    "order": 4,
                },
            ],
        },
        {
            "id": "module-3-playbook",
            "title": "Playbook",
            "description": "Combine multiple indicators with AND logic to build high-conviction, multi-condition strategies.",
            "order": 3,
            "lessons": [
                {
                    "id": "lesson-9-stoch-rsi-double",
                    "title": "Stochastic + RSI Double Oversold",
                    "description": "Require two oscillators to agree before entering — introducing the AND gate.",
                    "template_name": "Stochastic + RSI Double Oversold",
                    "difficulty": "advanced",
                    "order": 1,
                },
                {
                    "id": "lesson-10-bollinger-rsi",
                    "title": "Bollinger + RSI Reversal",
                    "description": "Combine a volatility band extreme with an oscillator extreme for mean-reversion.",
                    "template_name": "Bollinger + RSI Reversal",
                    "difficulty": "advanced",
                    "order": 2,
                },
                {
                    "id": "lesson-11-ema-rsi-confirm",
                    "title": "EMA + RSI Confirmation",
                    "description": "Gate a trend entry on an RSI cap to avoid chasing overbought moves.",
                    "template_name": "EMA + RSI Confirmation",
                    "difficulty": "advanced",
                    "order": 3,
                },
                {
                    "id": "lesson-12-macd-adx-dual",
                    "title": "MACD + ADX Dual Filter",
                    "description": "Combine a momentum indicator with a trend-strength indicator for high-precision entries.",
                    "template_name": "MACD + ADX Dual Filter",
                    "difficulty": "advanced",
                    "order": 4,
                },
            ],
        },
    ]
}

# Validate at module load time so misconfiguration is caught on startup.
_KNOWN_TEMPLATE_NAMES: set[str] = {t["name"] for t in TEMPLATES}

from app.services.curriculum_validation import validate_registry  # noqa: E402

validate_registry(CURRICULUM, _KNOWN_TEMPLATE_NAMES)

# Precomputed index built once at module load: template_name → lesson_id.
# Lets callers resolve a lesson from a template name with an O(1) lookup
# instead of re-walking the curriculum on every request.
LESSON_ID_BY_TEMPLATE_NAME: dict[str, str] = {
    lesson["template_name"]: lesson["id"]
    for module in CURRICULUM["modules"]
    for lesson in module["lessons"]
}
