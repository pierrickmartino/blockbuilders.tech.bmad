import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useOnboardingArmEnrollment } from "../useOnboardingArmEnrollment";
import { getExperimentVariant } from "@/lib/experiment-variant";
import { WIZARD_ROUTE, NL_WEDGE_ROUTE, ONBOARDED_ROUTE } from "@/lib/onboarding-arm";
import { trackEvent } from "@/lib/analytics";

vi.mock("@/lib/experiment-variant", async () => {
  const actual = await vi.importActual<typeof import("@/lib/experiment-variant")>(
    "@/lib/experiment-variant"
  );
  return {
    ...actual,
    getExperimentVariant: vi.fn(),
  };
});

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockGetExperimentVariant = vi.mocked(getExperimentVariant);
const mockTrackEvent = vi.mocked(trackEvent);

const USER = { id: "user-1", has_completed_onboarding: false };
const ONBOARDED_USER = { id: "user-2", has_completed_onboarding: true };

describe("useOnboardingArmEnrollment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes to the NL box and fires onboarding_ab_enrolled with arm nl_wedge for the test variant", () => {
    mockGetExperimentVariant.mockReturnValue("test");

    const { result } = renderHook(() =>
      useOnboardingArmEnrollment(USER, true)
    );

    expect(result.current).toEqual({ arm: "nl_wedge", route: NL_WEDGE_ROUTE });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "onboarding_ab_enrolled",
      { arm: "nl_wedge" },
      "user-1"
    );
  });

  it("routes to the wizard and fires onboarding_ab_enrolled with arm wizard for the control variant", () => {
    mockGetExperimentVariant.mockReturnValue("control");

    const { result } = renderHook(() =>
      useOnboardingArmEnrollment(USER, true)
    );

    expect(result.current).toEqual({ arm: "wizard", route: WIZARD_ROUTE });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "onboarding_ab_enrolled",
      { arm: "wizard" },
      "user-1"
    );
  });

  it("default-routes to the wizard without enrolling for an undefined variant (no/late consent)", () => {
    mockGetExperimentVariant.mockReturnValue(undefined);

    const { result } = renderHook(() =>
      useOnboardingArmEnrollment(USER, true)
    );

    expect(result.current).toEqual({ arm: "wizard", route: WIZARD_ROUTE });
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("routes to the wizard without enrolling when the drafter kill-switch is off, even for the test variant", () => {
    mockGetExperimentVariant.mockReturnValue("test");

    const { result } = renderHook(() =>
      useOnboardingArmEnrollment(USER, false)
    );

    expect(result.current).toEqual({ arm: "wizard", route: WIZARD_ROUTE });
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("routes an already-onboarded user normally and does not enroll or read the variant", () => {
    const { result } = renderHook(() =>
      useOnboardingArmEnrollment(ONBOARDED_USER, true)
    );

    expect(result.current).toEqual({ arm: null, route: ONBOARDED_ROUTE });
    expect(mockGetExperimentVariant).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("returns null and reads nothing while the user is not yet available", () => {
    const { result } = renderHook(() => useOnboardingArmEnrollment(null, true));

    expect(result.current).toBeNull();
    expect(mockGetExperimentVariant).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("reads the variant only once and fires the exposure event only once across re-renders", () => {
    mockGetExperimentVariant.mockReturnValue("test");

    const { rerender } = renderHook(
      ({ user }) => useOnboardingArmEnrollment(user, true),
      { initialProps: { user: USER } }
    );

    rerender({ user: USER });
    rerender({ user: USER });

    expect(mockGetExperimentVariant).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});
