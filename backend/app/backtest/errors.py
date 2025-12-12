"""Custom exceptions for backtest engine."""


class BacktestError(Exception):
    """Base exception for backtest errors."""

    def __init__(self, message: str, user_message: str | None = None):
        super().__init__(message)
        self.message = message
        self.user_message = user_message or message


class DataUnavailableError(BacktestError):
    """Raised when market data cannot be fetched or is missing."""

    pass


class StrategyInvalidError(BacktestError):
    """Raised when strategy definition is invalid or unsupported."""

    pass
