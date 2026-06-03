import { describe, it, expect, vi, beforeEach } from "vitest";
import { BillingApiClient, billingKeys } from "@/lib/api/billing-client";
import * as api from "@/lib/api/internal/fetch";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);

const mockCheckoutUrl = { url: "https://checkout.stripe.com/session-123" };
const mockPortalUrl = { url: "https://billing.stripe.com/portal-456" };

describe("billingKeys", () => {
  it("all() returns root scope key", () => {
    expect(billingKeys.all()).toEqual(["billing"]);
  });
});

describe("BillingApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createCheckoutSession ─────────────────────────────────────────────────

  describe("createCheckoutSession()", () => {
    it("calls POST /billing/checkout-session with tier and interval", async () => {
      mockApiFetch.mockResolvedValueOnce(mockCheckoutUrl);
      await BillingApiClient.createCheckoutSession("pro", "monthly");
      expect(mockApiFetch).toHaveBeenCalledWith("/billing/checkout-session", {
        method: "POST",
        body: JSON.stringify({ plan_tier: "pro", interval: "monthly" }),
      });
    });

    it("returns the checkout url", async () => {
      mockApiFetch.mockResolvedValueOnce(mockCheckoutUrl);
      const result = await BillingApiClient.createCheckoutSession("premium", "annual");
      expect(result).toEqual(mockCheckoutUrl);
    });
  });

  // ── createPortalSession ───────────────────────────────────────────────────

  describe("createPortalSession()", () => {
    it("calls POST /billing/portal-session with no body", async () => {
      mockApiFetch.mockResolvedValueOnce(mockPortalUrl);
      await BillingApiClient.createPortalSession();
      expect(mockApiFetch).toHaveBeenCalledWith("/billing/portal-session", {
        method: "POST",
      });
    });

    it("returns the portal url", async () => {
      mockApiFetch.mockResolvedValueOnce(mockPortalUrl);
      const result = await BillingApiClient.createPortalSession();
      expect(result).toEqual(mockPortalUrl);
    });
  });

  // ── createCreditPackCheckout ──────────────────────────────────────────────

  describe("createCreditPackCheckout()", () => {
    it("calls POST /billing/credit-pack/checkout-session with pack type", async () => {
      mockApiFetch.mockResolvedValueOnce(mockCheckoutUrl);
      await BillingApiClient.createCreditPackCheckout("backtest_credits");
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/billing/credit-pack/checkout-session",
        {
          method: "POST",
          body: JSON.stringify({ pack: "backtest_credits" }),
        }
      );
    });

    it("returns the checkout url", async () => {
      mockApiFetch.mockResolvedValueOnce(mockCheckoutUrl);
      const result = await BillingApiClient.createCreditPackCheckout("strategy_slots");
      expect(result).toEqual(mockCheckoutUrl);
    });
  });
});
