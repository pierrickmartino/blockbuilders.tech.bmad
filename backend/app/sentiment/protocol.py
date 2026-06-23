"""SentimentFeed protocol shared by all vendor implementations."""
from typing import Literal, Optional, Protocol

from app.schemas.market import SentimentIndicator


class SentimentFeed(Protocol):
    """Structural protocol every sentiment-data vendor must satisfy."""

    name: str

    def fetch(
        self, asset: str
    ) -> tuple[Optional[SentimentIndicator], Literal["ok", "unavailable"]]: ...
