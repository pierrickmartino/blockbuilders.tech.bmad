import React from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OAuthCallbackPage from "../page";
import { useAuth } from "@/context/auth";
import { getExperimentVariant } from "@/lib/experiment-variant";
import { getFeatureFlag } from "@/lib/feature-flags";
import { trackEvent } from "@/lib/analytics";
import { WIZARD_ROUTE, NL_WEDGE_ROUTE, ONBOARDED_ROUTE } from "@/lib/onboarding-arm";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/context/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/experiment-variant", async () => {
  const actual = await vi.importActual<typeof import("@/lib/experiment-variant")>(
    "@/lib/experiment-variant"
  );
  return { ...actual, getExperimentVariant: vi.fn() };
});

vi.mock("@/lib/feature-flags", async () => {
  const actual = await vi.importActual<typeof import("@/lib/feature-flags")>(
    "@/lib/feature-flags"
  );
  return { ...actual, getFeatureFlag: vi.fn() };
});

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockGetExperimentVariant = vi.mocked(getExperimentVariant);
const mockGetFeatureFlag = vi.mocked(getFeatureFlag);
const mockTrackEvent = vi.mocked(trackEvent);

function mockAuth(user: { id: string; has_completed_onboarding: boolean } | null) {
  mockUseAuth.mockReturnValue({
    user,
    completeOAuth: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useAuth>);
}

describe("OAuthCallbackPage routing fork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlag.mockReturnValue(true);
  });

  it("routes a resolved test variant to the NL box and enrolls", async () => {
    mockGetExperimentVariant.mockReturnValue("test");
    mockAuth({ id: "user-1", has_completed_onboarding: false });

    render(<OAuthCallbackPage />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(NL_WEDGE_ROUTE));
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "onboarding_ab_enrolled",
      { arm: "nl_wedge" },
      "user-1"
    );
  });

  it("routes a resolved control variant to the wizard and enrolls", async () => {
    mockGetExperimentVariant.mockReturnValue("control");
    mockAuth({ id: "user-2", has_completed_onboarding: false });

    render(<OAuthCallbackPage />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(WIZARD_ROUTE));
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "onboarding_ab_enrolled",
      { arm: "wizard" },
      "user-2"
    );
  });

  it("default-routes an undefined variant to the wizard without enrolling", async () => {
    mockGetExperimentVariant.mockReturnValue(undefined);
    mockAuth({ id: "user-3", has_completed_onboarding: false });

    render(<OAuthCallbackPage />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(WIZARD_ROUTE));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("routes an already-onboarded user to dashboard without enrolling or reading the variant", async () => {
    mockAuth({ id: "user-4", has_completed_onboarding: true });

    render(<OAuthCallbackPage />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(ONBOARDED_ROUTE));
    expect(mockGetExperimentVariant).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("routes a new user to the wizard without enrolling when the drafter kill-switch is off", async () => {
    mockGetFeatureFlag.mockReturnValue(false);
    mockGetExperimentVariant.mockReturnValue("test");
    mockAuth({ id: "user-5", has_completed_onboarding: false });

    render(<OAuthCallbackPage />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(WIZARD_ROUTE));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("does not push until the user is available", () => {
    mockAuth(null);

    render(<OAuthCallbackPage />);

    expect(mockPush).not.toHaveBeenCalled();
  });
});
