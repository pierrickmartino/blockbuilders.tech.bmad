import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    opt_out_capturing: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
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

describe("identifyUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("never identifies the PostHog person before consent has been accepted", async () => {
    const posthogModule = await import("posthog-js");
    const mockPosthog = vi.mocked(posthogModule.default);
    const { identifyUser } = await import("@/lib/analytics");

    identifyUser("42");

    expect(mockPosthog.identify).not.toHaveBeenCalled();
  });

  it("identifies the PostHog person with String(user.id) once consent is accepted", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key");

    const posthogModule = await import("posthog-js");
    const mockPosthog = vi.mocked(posthogModule.default);
    const { setConsent, identifyUser } = await import("@/lib/analytics");

    setConsent(true);
    identifyUser("42");

    expect(mockPosthog.identify).toHaveBeenCalledWith("42");
  });
});

describe("resetIdentity", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("detaches the session from its identified PostHog person on logout", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key");

    const posthogModule = await import("posthog-js");
    const mockPosthog = vi.mocked(posthogModule.default);
    const { setConsent, resetIdentity } = await import("@/lib/analytics");

    setConsent(true);
    resetIdentity();

    expect(mockPosthog.reset).toHaveBeenCalled();
  });
});
