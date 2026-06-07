import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
}));

vi.mock("@/lib/api/analytics-client", () => ({
  AnalyticsApiClient: {
    updateConsent: vi.fn(),
  },
}));

import * as analyticsClientModule from "@/lib/api/analytics-client";

const mockAnalyticsClient = vi.mocked(analyticsClientModule.AnalyticsApiClient);

describe("setConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("calls the analytics-consent endpoint with 'accepted' when the user is authenticated", async () => {
    localStorage.setItem("token", "a-jwt-token");
    mockAnalyticsClient.updateConsent.mockResolvedValueOnce(undefined);

    const { setConsent } = await import("@/lib/analytics");
    setConsent(true);

    await vi.waitFor(() => {
      expect(mockAnalyticsClient.updateConsent).toHaveBeenCalledWith("accepted");
    });
  });

  it("calls the analytics-consent endpoint with 'declined' when the user is authenticated", async () => {
    localStorage.setItem("token", "a-jwt-token");
    mockAnalyticsClient.updateConsent.mockResolvedValueOnce(undefined);

    const { setConsent } = await import("@/lib/analytics");
    setConsent(false);

    await vi.waitFor(() => {
      expect(mockAnalyticsClient.updateConsent).toHaveBeenCalledWith("declined");
    });
  });

  it("does not call the endpoint when the user is anonymous (no token)", async () => {
    const { setConsent } = await import("@/lib/analytics");
    setConsent(true);

    expect(mockAnalyticsClient.updateConsent).not.toHaveBeenCalled();
  });
});
