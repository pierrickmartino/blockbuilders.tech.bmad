"""Pure validation logic for strategy definitions.

Zero I/O, zero DB, zero HTTP — safe to unit test without any app context.
"""
from app.schemas.strategy import Block, StrategyDefinitionValidate, ValidationError
from app.validation.error_messages import get_error_message


def validate_block_params(block: Block) -> list[ValidationError]:
    """Validate block parameters are within allowed ranges."""
    errors: list[ValidationError] = []
    params = block.params

    if block.type == "constant":
        value = params.get("value", 0)
        if not isinstance(value, (int, float)):
            user_msg, help_link = get_error_message("INVALID_VALUE", min_val=-1_000_000, max_val=1_000_000)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_VALUE",
                    message=f"Constant value must be a number, got {type(value).__name__}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )
        elif not -1_000_000 <= value <= 1_000_000:
            user_msg, help_link = get_error_message("INVALID_VALUE", min_val=-1_000_000, max_val=1_000_000)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_VALUE",
                    message=f"Constant value must be between -1,000,000 and 1,000,000, got {value}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    if block.type in ("sma", "ema", "bollinger", "atr"):
        period = params.get("period", 0)
        if not isinstance(period, (int, float)) or not 1 <= period <= 500:
            user_msg, help_link = get_error_message("INVALID_PERIOD", min_val=1, max_val=500)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERIOD",
                    message=f"Period must be 1-500, got {period}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    if block.type == "rsi":
        period = params.get("period", 0)
        if not isinstance(period, (int, float)) or not 2 <= period <= 100:
            user_msg, help_link = get_error_message("INVALID_PERIOD", min_val=2, max_val=100)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERIOD",
                    message=f"RSI period must be 2-100, got {period}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    if block.type == "macd":
        fast = params.get("fast_period", 0)
        slow = params.get("slow_period", 0)
        signal = params.get("signal_period", 0)
        if not isinstance(fast, (int, float)) or not 1 <= fast <= 50:
            user_msg, help_link = get_error_message("INVALID_PARAM", param_name="MACD fast period", min_val=1, max_val=50)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PARAM",
                    message=f"MACD fast period must be 1-50, got {fast}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )
        if not isinstance(slow, (int, float)) or not 1 <= slow <= 200:
            user_msg, help_link = get_error_message("INVALID_PARAM", param_name="MACD slow period", min_val=1, max_val=200)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PARAM",
                    message=f"MACD slow period must be 1-200, got {slow}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )
        if not isinstance(signal, (int, float)) or not 1 <= signal <= 50:
            user_msg, help_link = get_error_message("INVALID_PARAM", param_name="MACD signal period", min_val=1, max_val=50)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PARAM",
                    message=f"MACD signal period must be 1-50, got {signal}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    if block.type == "position_size":
        value = params.get("value", 0)
        if not isinstance(value, (int, float)) or not 1 <= value <= 100:
            user_msg, help_link = get_error_message("INVALID_PERCENT", min_val=1, max_val=100)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERCENT",
                    message=f"Position size must be 1-100%, got {value}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    if block.type == "take_profit":
        levels = params.get("levels")
        if levels and isinstance(levels, list):
            if not 1 <= len(levels) <= 3:
                user_msg, help_link = get_error_message("INVALID_LEVELS")
                errors.append(
                    ValidationError(
                        block_id=block.id,
                        code="INVALID_LEVELS",
                        message=f"Take profit must have 1-3 levels, got {len(levels)}",
                        user_message=user_msg,
                        help_link=help_link,
                    )
                )
            else:
                total_close = 0
                prev_profit = 0.0
                for idx, lvl in enumerate(levels):
                    if not isinstance(lvl, dict):
                        user_msg, help_link = get_error_message("INVALID_LEVEL", level_num=idx + 1)
                        errors.append(
                            ValidationError(
                                block_id=block.id,
                                code="INVALID_LEVEL",
                                message=f"Level {idx + 1} must be an object",
                                user_message=user_msg,
                                help_link=help_link,
                            )
                        )
                        continue
                    profit_pct = lvl.get("profit_pct", 0)
                    close_pct = lvl.get("close_pct", 0)
                    if not isinstance(profit_pct, (int, float)) or profit_pct <= 0:
                        user_msg, help_link = get_error_message("INVALID_PROFIT", level_num=idx + 1)
                        errors.append(
                            ValidationError(
                                block_id=block.id,
                                code="INVALID_PROFIT",
                                message=f"Level {idx + 1} profit_pct must be > 0",
                                user_message=user_msg,
                                help_link=help_link,
                            )
                        )
                    elif profit_pct <= prev_profit:
                        user_msg, help_link = get_error_message("INVALID_PROFIT_ORDER", level_num=idx + 1)
                        errors.append(
                            ValidationError(
                                block_id=block.id,
                                code="INVALID_PROFIT_ORDER",
                                message=f"Level {idx + 1} profit must be > previous level",
                                user_message=user_msg,
                                help_link=help_link,
                            )
                        )
                    prev_profit = float(profit_pct)
                    if not isinstance(close_pct, (int, float)) or not 1 <= close_pct <= 100:
                        user_msg, help_link = get_error_message("INVALID_CLOSE", level_num=idx + 1)
                        errors.append(
                            ValidationError(
                                block_id=block.id,
                                code="INVALID_CLOSE",
                                message=f"Level {idx + 1} close_pct must be 1-100%",
                                user_message=user_msg,
                                help_link=help_link,
                            )
                        )
                    total_close += close_pct
                if total_close > 100:
                    user_msg, help_link = get_error_message("INVALID_TOTAL_CLOSE", total=total_close)
                    errors.append(
                        ValidationError(
                            block_id=block.id,
                            code="INVALID_TOTAL_CLOSE",
                            message=f"Total close % cannot exceed 100%, got {total_close}%",
                            user_message=user_msg,
                            help_link=help_link,
                        )
                    )
        else:
            pct = params.get("take_profit_pct", 0)
            if not isinstance(pct, (int, float)) or not 0.1 <= pct <= 100:
                user_msg, help_link = get_error_message("INVALID_PERCENT", min_val=0.1, max_val=100)
                errors.append(
                    ValidationError(
                        block_id=block.id,
                        code="INVALID_PERCENT",
                        message=f"Take profit must be 0.1-100%, got {pct}",
                        user_message=user_msg,
                        help_link=help_link,
                    )
                )

    if block.type == "stop_loss":
        pct = params.get("stop_loss_pct", 0)
        if not isinstance(pct, (int, float)) or not 0.1 <= pct <= 100:
            user_msg, help_link = get_error_message("INVALID_PERCENT", min_val=0.1, max_val=100)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERCENT",
                    message=f"Stop loss must be 0.1-100%, got {pct}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    if block.type == "max_drawdown":
        pct = params.get("max_drawdown_pct", 0)
        if not isinstance(pct, (int, float)) or not 0.1 <= pct <= 100:
            user_msg, help_link = get_error_message("INVALID_PERCENT", min_val=0.1, max_val=100)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERCENT",
                    message=f"Max drawdown must be 0.1-100%, got {pct}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    elif block.type == "time_exit":
        bars = params.get("bars", 0)
        if not isinstance(bars, (int, float)) or bars < 1:
            user_msg, help_link = get_error_message("INVALID_BARS")
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_BARS",
                    message=f"Time Exit bars must be >= 1, got {bars}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    elif block.type == "trailing_stop":
        trail_pct = params.get("trail_pct", 0)
        if not isinstance(trail_pct, (int, float)) or not 0 < trail_pct <= 100:
            user_msg, help_link = get_error_message("INVALID_PERCENT", min_val=0.1, max_val=100)
            errors.append(
                ValidationError(
                    block_id=block.id,
                    code="INVALID_PERCENT",
                    message=f"Trailing stop must be 0-100%, got {trail_pct}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    return errors


def collect_validation_errors(definition: StrategyDefinitionValidate) -> list[ValidationError]:
    errors: list[ValidationError] = []
    block_types = [b.type for b in definition.blocks]
    block_ids = {b.id for b in definition.blocks}

    entry_count = block_types.count("entry_signal")
    if entry_count == 0:
        user_msg, help_link = get_error_message("MISSING_ENTRY")
        errors.append(
            ValidationError(
                code="MISSING_ENTRY",
                message="At least one Entry Signal block is required",
                user_message=user_msg,
                help_link=help_link,
            )
        )

    exit_signal_count = block_types.count("exit_signal")
    exit_rule_types = ("time_exit", "trailing_stop", "stop_loss", "take_profit", "max_drawdown")
    exit_rule_count = sum(1 for t in block_types if t in exit_rule_types)
    if exit_signal_count == 0 and exit_rule_count == 0:
        user_msg, help_link = get_error_message("MISSING_EXIT")
        errors.append(
            ValidationError(
                code="MISSING_EXIT",
                message="At least one exit condition required (Exit Signal or Risk block)",
                user_message=user_msg,
                help_link=help_link,
            )
        )

    connected_targets = {conn.to_port.block_id for conn in definition.connections}
    for block in definition.blocks:
        if block.type in ("entry_signal", "exit_signal"):
            if block.id not in connected_targets:
                signal_type = "Entry Signal" if block.type == "entry_signal" else "Exit Signal"
                user_msg, help_link = get_error_message("UNCONNECTED_SIGNAL", signal_type=signal_type)
                errors.append(
                    ValidationError(
                        block_id=block.id,
                        code="UNCONNECTED_SIGNAL",
                        message=f"{block.label} must have an input connection",
                        user_message=user_msg,
                        help_link=help_link,
                    )
                )

    risk_counts: dict[str, int] = {
        "position_size": 0,
        "take_profit": 0,
        "stop_loss": 0,
        "max_drawdown": 0,
        "time_exit": 0,
        "trailing_stop": 0,
    }
    for block in definition.blocks:
        if block.type in risk_counts:
            risk_counts[block.type] += 1

    for risk_type, count in risk_counts.items():
        if count > 1:
            label = risk_type.replace("_", " ").title()
            user_msg, help_link = get_error_message("DUPLICATE_RISK", block_type=label)
            errors.append(
                ValidationError(
                    code="DUPLICATE_RISK",
                    message=f"Only one {label} block allowed, found {count}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    for conn in definition.connections:
        if conn.from_port.block_id not in block_ids:
            user_msg, help_link = get_error_message("INVALID_CONNECTION")
            errors.append(
                ValidationError(
                    code="INVALID_CONNECTION",
                    message=f"Connection references non-existent block: {conn.from_port.block_id}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )
        if conn.to_port.block_id not in block_ids:
            user_msg, help_link = get_error_message("INVALID_CONNECTION")
            errors.append(
                ValidationError(
                    code="INVALID_CONNECTION",
                    message=f"Connection references non-existent block: {conn.to_port.block_id}",
                    user_message=user_msg,
                    help_link=help_link,
                )
            )

    for block in definition.blocks:
        errors.extend(validate_block_params(block))

    return errors
