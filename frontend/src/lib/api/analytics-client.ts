import { apiFetchVoid } from "@/lib/api/internal/fetch";

export type AnalyticsConsentValue = "accepted" | "declined";

export const AnalyticsApiClient = {
  async updateConsent(consent: AnalyticsConsentValue): Promise<void> {
    await apiFetchVoid("/users/me/analytics-consent", {
      method: "PATCH",
      body: JSON.stringify({ consent }),
    });
  },
};
