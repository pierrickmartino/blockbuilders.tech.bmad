"""Plain-language error messages for strategy validation.

Maps error codes to user-friendly messages with actionable suggestions and help links.
"""

ERROR_MESSAGES = {
    "MISSING_ENTRY": {
        "message": "Your strategy needs an Entry Signal. Add one and connect it to an indicator or logic block.",
        "help_link": "/strategy-guide#entry-signals",
    },
    "MISSING_EXIT": {
        "message": "Add at least one exit rule (Exit Signal, Stop Loss, Take Profit, etc.).",
        "help_link": "/strategy-guide#exit-signals",
    },
    "UNCONNECTED_SIGNAL": {
        "message": "Your {signal_type} needs a connection. Try connecting an indicator or logic block to it.",
        "help_link": "/strategy-guide#connections",
    },
    "DUPLICATE_RISK": {
        "message": "You can only have one {block_type} block. Remove the extra ones.",
        "help_link": "/strategy-guide#risk-management",
    },
    "INVALID_CONNECTION": {
        "message": "This connection references a block that doesn't exist. Delete the connection and try again.",
        "help_link": None,
    },
    "INVALID_PERIOD": {
        "message": "Period must be between {min_val} and {max_val}. Adjust it to a number in that range.",
        "help_link": "/strategy-guide#indicators",
    },
    "INVALID_PERCENT": {
        "message": "Percentage must be between {min_val}% and {max_val}%. Adjust it to a number in that range.",
        "help_link": "/strategy-guide#risk-management",
    },
    "INVALID_VALUE": {
        "message": "Value must be a number between {min_val} and {max_val}.",
        "help_link": None,
    },
    "INVALID_PARAM": {
        "message": "{param_name} must be between {min_val} and {max_val}. Adjust it to a number in that range.",
        "help_link": "/strategy-guide#indicators",
    },
    "INVALID_LEVELS": {
        "message": "Take Profit must have 1-3 levels. Add or remove levels to fit this range.",
        "help_link": "/strategy-guide#risk-management",
    },
    "INVALID_LEVEL": {
        "message": "Take Profit level {level_num} must be a valid configuration object.",
        "help_link": "/strategy-guide#risk-management",
    },
    "INVALID_PROFIT": {
        "message": "Level {level_num} profit percentage must be greater than 0.",
        "help_link": "/strategy-guide#risk-management",
    },
    "INVALID_PROFIT_ORDER": {
        "message": "Level {level_num} profit must be greater than the previous level.",
        "help_link": "/strategy-guide#risk-management",
    },
    "INVALID_CLOSE": {
        "message": "Level {level_num} close percentage must be between 1% and 100%.",
        "help_link": "/strategy-guide#risk-management",
    },
    "INVALID_TOTAL_CLOSE": {
        "message": "Total close percentage cannot exceed 100%. You have {total}%.",
        "help_link": "/strategy-guide#risk-management",
    },
    "INVALID_BARS": {
        "message": "Time Exit bars must be at least 1.",
        "help_link": "/strategy-guide#risk-management",
    },
}


def get_error_message(code: str, **kwargs) -> tuple[str, str | None]:
    """Get user-friendly error message and help link for an error code.

    Args:
        code: Error code (e.g., "MISSING_ENTRY")
        **kwargs: Template variables for parameterized messages

    Returns:
        (user_message, help_link) tuple

    Example:
        >>> get_error_message("MISSING_ENTRY")
        ("Your strategy needs an Entry Signal...", "/strategy-guide#entry-signals")
        >>> get_error_message("INVALID_PERIOD", min_val=1, max_val=500)
        ("Period must be between 1 and 500...", "/strategy-guide#indicators")
    """
    template = ERROR_MESSAGES.get(code)
    if not template:
        # Fallback for unmapped codes
        return (f"Validation error: {code}", None)

    message = template["message"]
    if kwargs:
        message = message.format(**kwargs)

    return (message, template.get("help_link"))
