import { apiFetch } from "@/lib/api/internal/fetch";

export const billingKeys = {
  all: (): string[] => ["billing"],
};

export const BillingApiClient = {
  async createCheckoutSession(
    tier: "pro" | "premium",
    interval: "monthly" | "annual"
  ): Promise<{ url: string }> {
    return apiFetch<{ url: string }>("/billing/checkout-session", {
      method: "POST",
      body: JSON.stringify({ plan_tier: tier, interval }),
    });
  },

  async createPortalSession(): Promise<{ url: string }> {
    return apiFetch<{ url: string }>("/billing/portal-session", {
      method: "POST",
    });
  },

  async createCreditPackCheckout(
    pack: "backtest_credits" | "strategy_slots"
  ): Promise<{ url: string }> {
    return apiFetch<{ url: string }>("/billing/credit-pack/checkout-session", {
      method: "POST",
      body: JSON.stringify({ pack }),
    });
  },
};
