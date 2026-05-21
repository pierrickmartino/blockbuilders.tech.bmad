"""Domain error base class and concrete subclasses."""
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
