"""API endpoints for billing operations."""
import logging
from typing import Literal

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_session
from app.models.user import User, PlanTier, PlanInterval, SubscriptionStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])

# Initialize Stripe
stripe.api_key = settings.stripe_secret_key

# Price ID mapping
PRICE_IDS = {
    ("pro", "monthly"): settings.stripe_price_pro_monthly,
    ("pro", "annual"): settings.stripe_price_pro_annual,
    ("premium", "monthly"): settings.stripe_price_premium_monthly,
    ("premium", "annual"): settings.stripe_price_premium_annual,
}


class CheckoutSessionRequest(BaseModel):
    plan_tier: Literal["pro", "premium"]
    interval: Literal["monthly", "annual"]


class CheckoutSessionResponse(BaseModel):
    url: str


class PortalSessionResponse(BaseModel):
    url: str


@router.post("/checkout-session", response_model=CheckoutSessionResponse)
def create_checkout_session(
    data: CheckoutSessionRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> CheckoutSessionResponse:
    """Create a Stripe Checkout session for plan upgrade."""
    # Get price ID
    price_id = PRICE_IDS.get((data.plan_tier, data.interval))
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan or interval",
        )

    # Create or retrieve Stripe customer
    if user.stripe_customer_id:
        customer_id = user.stripe_customer_id
    else:
        customer = stripe.Customer.create(
            email=user.email,
            metadata={"user_id": str(user.id)},
        )
        customer_id = customer.id
        user.stripe_customer_id = customer_id
        session.add(user)
        session.commit()

    # Create checkout session
    checkout_session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.frontend_url}/profile?billing_success=true",
        cancel_url=f"{settings.frontend_url}/profile?billing_canceled=true",
        metadata={
            "user_id": str(user.id),
            "plan_tier": data.plan_tier,
            "interval": data.interval,
        },
    )

    return CheckoutSessionResponse(url=checkout_session.url)


@router.post("/portal-session", response_model=PortalSessionResponse)
def create_portal_session(
    user: User = Depends(get_current_user),
) -> PortalSessionResponse:
    """Create a Stripe Billing Portal session for subscription management."""
    if not user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found",
        )

    portal_session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{settings.frontend_url}/profile",
    )

    return PortalSessionResponse(url=portal_session.url)


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    session: Session = Depends(get_session),
):
    """Handle Stripe webhook events for subscription changes."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError:
        logger.error("Invalid webhook payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle subscription events
    if event["type"] in [
        "customer.subscription.created",
        "customer.subscription.updated",
    ]:
        subscription = event["data"]["object"]
        await _handle_subscription_update(subscription, session)
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        await _handle_subscription_deleted(subscription, session)

    return {"status": "success"}


async def _handle_subscription_update(subscription: dict, session: Session):
    """Update user plan based on subscription data."""
    customer_id = subscription["customer"]

    # Find user by Stripe customer ID
    user = session.exec(
        select(User).where(User.stripe_customer_id == customer_id)
    ).first()

    if not user:
        logger.warning(f"No user found for Stripe customer {customer_id}")
        return

    # Extract plan tier and interval from price ID
    price_id = subscription["items"]["data"][0]["price"]["id"]
    plan_tier = None
    plan_interval = None

    for (tier, interval), pid in PRICE_IDS.items():
        if pid == price_id:
            plan_tier = tier
            plan_interval = interval
            break

    if not plan_tier:
        logger.error(f"Unknown price ID {price_id}")
        return

    # Update user
    user.plan_tier = PlanTier(plan_tier)
    user.plan_interval = PlanInterval(plan_interval)
    user.stripe_subscription_id = subscription["id"]
    user.subscription_status = SubscriptionStatus(subscription["status"])

    session.add(user)
    session.commit()

    logger.info(f"Updated user {user.id} to {plan_tier}/{plan_interval}")


async def _handle_subscription_deleted(subscription: dict, session: Session):
    """Downgrade user to free plan when subscription is deleted."""
    subscription_id = subscription["id"]

    # Find user by subscription ID
    user = session.exec(
        select(User).where(User.stripe_subscription_id == subscription_id)
    ).first()

    if not user:
        logger.warning(f"No user found for subscription {subscription_id}")
        return

    # Downgrade to free
    user.plan_tier = PlanTier.FREE
    user.plan_interval = None
    user.subscription_status = SubscriptionStatus.CANCELED

    session.add(user)
    session.commit()

    logger.info(f"Downgraded user {user.id} to free plan")
