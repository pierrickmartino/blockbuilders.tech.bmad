"""Domain error base class and concrete subclasses."""
from __future__ import annotations

from datetime import datetime

from app.schemas.strategy import ValidationError


class DomainError(Exception):
    status_code: int = 500

    def detail(self) -> dict:
        raise NotImplementedError


class StrategyValidationError(DomainError):
    status_code = 400

    def __init__(self, errors: list[ValidationError]) -> None:
        self.errors = errors
        super().__init__(repr(errors))

    def detail(self) -> dict:
        return {"errors": [e.model_dump() for e in self.errors]}


class DailyLimitReached(DomainError):
    status_code = 429

    def __init__(self, limit: int, reset_time: datetime) -> None:
        self.limit = limit
        self.reset_time = reset_time
        super().__init__(f"Daily backtest limit reached ({limit})")

    def detail(self) -> dict:
        return {
            "detail": (
                f"Daily backtest limit reached ({self.limit}). "
                f"Purchase credits or resets at {self.reset_time.isoformat()}."
            )
        }


class HistoryDepthExceeded(DomainError):
    status_code = 400

    def __init__(self, limit_days: int) -> None:
        self.limit_days = limit_days
        super().__init__(f"History depth exceeded: {limit_days} days")

    def detail(self) -> dict:
        return {
            "detail": (
                f"Date range exceeds your plan's historical data limit "
                f"({self.limit_days} days). Upgrade to access longer history."
            )
        }


class StrategyHasNoVersions(DomainError):
    status_code = 400

    def __init__(self) -> None:
        super().__init__("Strategy has no versions")

    def detail(self) -> dict:
        return {"detail": "Strategy has no saved versions"}


class ShareLinkNotFound(DomainError):
    status_code = 404

    def __init__(self) -> None:
        super().__init__("Share link not found or has expired")

    def detail(self) -> dict:
        return {"detail": "Share link not found or has expired"}


class ShareLinkExpired(DomainError):
    status_code = 404

    def __init__(self) -> None:
        super().__init__("This share link has expired")

    def detail(self) -> dict:
        return {"detail": "This share link has expired"}


class ShareExpirationInvalid(DomainError):
    status_code = 400

    def __init__(self) -> None:
        super().__init__("Expiration date must be in the future")

    def detail(self) -> dict:
        return {"detail": "Expiration date must be in the future"}
