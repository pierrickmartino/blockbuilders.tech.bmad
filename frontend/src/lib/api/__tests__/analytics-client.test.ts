import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsApiClient } from "@/lib/api/analytics-client";
import * as api from "@/lib/api/internal/fetch";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetchVoid = vi.mocked(api.apiFetchVoid);

describe("AnalyticsApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateConsent()", () => {
    it("calls PATCH /users/me/analytics-consent with the consent body", async () => {
      await AnalyticsApiClient.updateConsent("accepted");
      expect(mockApiFetchVoid).toHaveBeenCalledWith("/users/me/analytics-consent", {
        method: "PATCH",
        body: JSON.stringify({ consent: "accepted" }),
      });
    });

    it("sends 'declined' when consent is declined", async () => {
      await AnalyticsApiClient.updateConsent("declined");
      expect(mockApiFetchVoid).toHaveBeenCalledWith("/users/me/analytics-consent", {
        method: "PATCH",
        body: JSON.stringify({ consent: "declined" }),
      });
    });
  });
});
