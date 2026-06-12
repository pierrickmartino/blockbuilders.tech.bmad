import { describe, it, expect } from "vitest";
import { resolveOnboardingArm, WIZARD_ROUTE, NL_WEDGE_ROUTE, ONBOARDED_ROUTE } from "@/lib/onboarding-arm";

describe("resolveOnboardingArm", () => {
  it("routes an already-onboarded user normally with no experiment route, regardless of variant", () => {
    expect(
      resolveOnboardingArm({ variant: "test", hasCompletedOnboarding: true, drafterEnabled: true })
    ).toEqual({ arm: null, route: ONBOARDED_ROUTE, enroll: false });
  });

  it("routes a new user to the wizard without enrolling when the drafter kill-switch is off, even if the variant is test", () => {
    expect(
      resolveOnboardingArm({ variant: "test", hasCompletedOnboarding: false, drafterEnabled: false })
    ).toEqual({ arm: "wizard", route: WIZARD_ROUTE, enroll: false });
  });

  it("routes a new user to the NL box and enrolls when the resolved variant is test and the drafter is on", () => {
    expect(
      resolveOnboardingArm({ variant: "test", hasCompletedOnboarding: false, drafterEnabled: true })
    ).toEqual({ arm: "nl_wedge", route: NL_WEDGE_ROUTE, enroll: true });
  });

  it("routes a new user to the wizard and enrolls when the resolved variant is control and the drafter is on", () => {
    expect(
      resolveOnboardingArm({ variant: "control", hasCompletedOnboarding: false, drafterEnabled: true })
    ).toEqual({ arm: "wizard", route: WIZARD_ROUTE, enroll: true });
  });

  it("default-routes a new user to the wizard without enrolling when the variant is undefined (no/late consent)", () => {
    expect(
      resolveOnboardingArm({ variant: undefined, hasCompletedOnboarding: false, drafterEnabled: true })
    ).toEqual({ arm: "wizard", route: WIZARD_ROUTE, enroll: false });
  });
});
