"""Shared delivery-intent types used by both alert evaluation paths."""
from dataclasses import dataclass


@dataclass
class EmailMessage:
    from_: str
    to: list[str]
    subject: str
    html: str


@dataclass
class WebhookPost:
    url: str
    payloads: list[dict]


@dataclass
class DeliveryIntent:
    """Describes what to send after the finalization commit.

    None (not a DeliveryIntent) means the evaluator skipped entirely.
    A DeliveryIntent with no email and no webhooks means conditions fired
    (watermark advanced) but no external delivery was configured.
    """
    email: EmailMessage | None = None
    webhooks: WebhookPost | None = None
