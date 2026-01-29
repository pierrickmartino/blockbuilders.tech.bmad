"""Tests for billing and Stripe webhook handling."""
import os
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from uuid import uuid4

import pytest
from sqlmodel import Session, SQLModel, create_engine, select
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_fake"
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test"

from app.models.user import User, PlanTier, PlanInterval, SubscriptionStatus, UserTier
from app.models.stripe_webhook_event import StripeWebhookEvent
from app.api.billing import (
    _handle_subscription_update,
    _handle_subscription_deleted,
    _handle_credit_pack_purchase,
    _handle_subscription_checkout,
    PRICE_IDS,
)
from app.core.plans import get_plan_pricing, get_plan_limits


@pytest.fixture(name="engine")
def engine_fixture():
    """Create test database engine."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine):
    """Create test database session."""
    with Session(engine) as session:
        yield session


@pytest.fixture
def subscribed_user(session: Session) -> User:
    """Create a user with active subscription."""
    user = User(
        id=uuid4(),
        email="subscribed@example.com",
        password_hash="$2b$12$hash",
        plan_tier=PlanTier.PRO,
        plan_interval=PlanInterval.MONTHLY,
        stripe_customer_id="cus_test123",
        stripe_subscription_id="sub_test123",
        subscription_status=SubscriptionStatus.ACTIVE,
        user_tier=UserTier.STANDARD,
        backtest_credit_balance=0,
        extra_strategy_slots=0,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def free_user(session: Session) -> User:
    """Create a free tier user."""
    user = User(
        id=uuid4(),
        email="free@example.com",
        password_hash="$2b$12$hash",
        plan_tier=PlanTier.FREE,
        stripe_customer_id="cus_free123",
        user_tier=UserTier.STANDARD,
        backtest_credit_balance=0,
        extra_strategy_slots=0,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


class TestPlanPricing:
    """Tests for plan pricing calculations."""

    def test_get_plan_pricing_standard_user(self):
        """Standard user should not get beta discount."""
        pricing = get_plan_pricing("pro", "monthly", "standard")

        assert pricing["base_price"] > 0
        assert pricing["discount_percent"] == 0
        assert pricing["final_price"] == pricing["base_price"]

    def test_get_plan_pricing_beta_user(self):
        """Beta user should get 20% discount."""
        pricing = get_plan_pricing("pro", "monthly", "beta")

        assert pricing["discount_percent"] == 0.20  # Returned as decimal
        assert pricing["final_price"] < pricing["base_price"]
        assert pricing["final_price"] == pricing["base_price"] * 0.8

    def test_get_plan_pricing_annual_discount(self):
        """Annual plans should be cheaper per month than monthly."""
        monthly = get_plan_pricing("pro", "monthly", "standard")
        annual = get_plan_pricing("pro", "annual", "standard")

        # Annual price for 12 months should be less than 12 * monthly
        assert annual["final_price"] < monthly["final_price"] * 12

    def test_get_plan_limits_free_tier(self):
        """Free tier should have base limits."""
        limits = get_plan_limits("free")

        assert limits["max_strategies"] > 0
        assert limits["max_backtests_per_day"] > 0

    def test_get_plan_limits_pro_tier(self):
        """Pro tier should have higher limits than free."""
        free_limits = get_plan_limits("free")
        pro_limits = get_plan_limits("pro")

        assert pro_limits["max_strategies"] > free_limits["max_strategies"]


class TestSubscriptionWebhooks:
    """Tests for subscription webhook handling."""

    @pytest.mark.asyncio
    async def test_handle_subscription_update_upgrades_plan(
        self, session: Session, free_user: User
    ):
        """Subscription update should upgrade user plan."""
        # Mock subscription data
        subscription = {
            "id": "sub_new123",
            "customer": free_user.stripe_customer_id,
            "status": "active",
            "items": {
                "data": [
                    {"price": {"id": list(PRICE_IDS.values())[0]}}  # First price ID
                ]
            },
        }

        # Handle the webhook
        await _handle_subscription_update(subscription, session)

        # Refresh user
        session.refresh(free_user)

        # Check upgrade
        assert free_user.stripe_subscription_id == "sub_new123"
        assert free_user.subscription_status == SubscriptionStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_handle_subscription_deleted_downgrades_to_free(
        self, session: Session, subscribed_user: User
    ):
        """Subscription deletion should downgrade to free tier."""
        subscription = {
            "id": subscribed_user.stripe_subscription_id,
            "customer": subscribed_user.stripe_customer_id,
        }

        await _handle_subscription_deleted(subscription, session)

        session.refresh(subscribed_user)

        assert subscribed_user.plan_tier == PlanTier.FREE
        assert subscribed_user.plan_interval is None
        assert subscribed_user.subscription_status == SubscriptionStatus.CANCELED

    @pytest.mark.asyncio
    async def test_handle_subscription_checkout_with_metadata(
        self, session: Session, free_user: User
    ):
        """Checkout completion should update plan from metadata."""
        checkout_session = {
            "id": "cs_test123",
            "customer": free_user.stripe_customer_id,
            "subscription": "sub_new456",
            "metadata": {
                "plan_tier": "premium",
                "interval": "annual",
                "beta_discount": "true",
            },
        }

        await _handle_subscription_checkout(checkout_session, session)

        session.refresh(free_user)

        assert free_user.plan_tier == PlanTier.PREMIUM
        assert free_user.plan_interval == PlanInterval.ANNUAL
        assert free_user.subscription_status == SubscriptionStatus.ACTIVE


class TestCreditPackPurchase:
    """Tests for credit pack purchase handling."""

    @pytest.mark.asyncio
    async def test_backtest_credits_added(self, session: Session, free_user: User):
        """Backtest credit pack should add 50 credits."""
        initial_balance = free_user.backtest_credit_balance

        checkout_session = {
            "id": "cs_credits123",
            "customer": free_user.stripe_customer_id,
            "metadata": {"pack_type": "backtest_credits"},
        }

        await _handle_credit_pack_purchase(
            checkout_session, "evt_123", "checkout.session.completed", session
        )

        session.refresh(free_user)

        assert free_user.backtest_credit_balance == initial_balance + 50

    @pytest.mark.asyncio
    async def test_strategy_slots_added(self, session: Session, free_user: User):
        """Strategy slots pack should add 5 slots."""
        initial_slots = free_user.extra_strategy_slots

        checkout_session = {
            "id": "cs_slots123",
            "customer": free_user.stripe_customer_id,
            "metadata": {"pack_type": "strategy_slots"},
        }

        await _handle_credit_pack_purchase(
            checkout_session, "evt_456", "checkout.session.completed", session
        )

        session.refresh(free_user)

        assert free_user.extra_strategy_slots == initial_slots + 5

    @pytest.mark.asyncio
    async def test_duplicate_webhook_is_idempotent(
        self, session: Session, free_user: User
    ):
        """Duplicate webhook should not add credits twice."""
        checkout_session = {
            "id": "cs_duplicate123",
            "customer": free_user.stripe_customer_id,
            "metadata": {"pack_type": "backtest_credits"},
        }
        event_id = "evt_duplicate123"

        # First call
        await _handle_credit_pack_purchase(
            checkout_session, event_id, "checkout.session.completed", session
        )

        balance_after_first = free_user.backtest_credit_balance

        # Second call with same event_id should not add more credits
        # (IntegrityError on StripeWebhookEvent insert)
        await _handle_credit_pack_purchase(
            checkout_session, event_id, "checkout.session.completed", session
        )

        session.refresh(free_user)

        # Balance should be same (idempotent)
        assert free_user.backtest_credit_balance == balance_after_first

    @pytest.mark.asyncio
    async def test_unknown_pack_type_ignored(self, session: Session, free_user: User):
        """Unknown pack type should be logged but not error."""
        initial_credits = free_user.backtest_credit_balance
        initial_slots = free_user.extra_strategy_slots

        checkout_session = {
            "id": "cs_unknown123",
            "customer": free_user.stripe_customer_id,
            "metadata": {"pack_type": "unknown_pack"},
        }

        await _handle_credit_pack_purchase(
            checkout_session, "evt_789", "checkout.session.completed", session
        )

        session.refresh(free_user)

        # Nothing should change
        assert free_user.backtest_credit_balance == initial_credits
        assert free_user.extra_strategy_slots == initial_slots


class TestWebhookIdempotency:
    """Tests for webhook event idempotency tracking."""

    @pytest.mark.asyncio
    async def test_webhook_event_recorded(self, session: Session, free_user: User):
        """Processed webhook should be recorded in database."""
        checkout_session = {
            "id": "cs_record123",
            "customer": free_user.stripe_customer_id,
            "metadata": {"pack_type": "backtest_credits"},
        }
        event_id = "evt_record123"

        await _handle_credit_pack_purchase(
            checkout_session, event_id, "checkout.session.completed", session
        )

        # Check event was recorded
        event = session.exec(
            select(StripeWebhookEvent).where(StripeWebhookEvent.event_id == event_id)
        ).first()

        assert event is not None
        assert event.session_id == "cs_record123"
