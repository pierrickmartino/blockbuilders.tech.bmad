import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  decideWhatYouLearnedCard,
  getExperimentVariant,
  onExperimentFlagsReady,
} from "@/lib/experiment-variant";

vi.mock("posthog-js", () => ({
  default: {
    getFeatureFlag: vi.fn(),
    onFeatureFlags: vi.fn(),
  },
}));

vi.mock("@/lib/analytics", () => ({
  getConsent: vi.fn(),
}));

import posthog from "posthog-js";
import { getConsent } from "@/lib/analytics";

const mockPosthog = vi.mocked(posthog);
const mockGetConsent = vi.mocked(getConsent);

describe("decideWhatYouLearnedCard", () => {
  it("short-circuits to { renderCard: false, closeGateNow: false } when alreadySeen is true regardless of eligible or variant", () => {
    expect(
      decideWhatYouLearnedCard({ eligible: true, variant: "test", alreadySeen: true })
    ).toEqual({ renderCard: false, closeGateNow: false });
  });

  it("returns { renderCard: false, closeGateNow: false } when not eligible", () => {
    expect(
      decideWhatYouLearnedCard({ eligible: false, variant: undefined, alreadySeen: false })
    ).toEqual({ renderCard: false, closeGateNow: false });
  });

  it("returns { renderCard: false, closeGateNow: false } when not eligible even with a variant assigned", () => {
    expect(
      decideWhatYouLearnedCard({ eligible: false, variant: "test", alreadySeen: false })
    ).toEqual({ renderCard: false, closeGateNow: false });
  });

  it("returns { renderCard: true, closeGateNow: false } when eligible and variant is undefined (unenrolled — preserves today's persist-until-dismissed behavior)", () => {
    expect(
      decideWhatYouLearnedCard({ eligible: true, variant: undefined, alreadySeen: false })
    ).toEqual({ renderCard: true, closeGateNow: false });
  });

  it("returns { renderCard: true, closeGateNow: true } when eligible and variant is test (show-once, gate closes at enrollment)", () => {
    expect(
      decideWhatYouLearnedCard({ eligible: true, variant: "test", alreadySeen: false })
    ).toEqual({ renderCard: true, closeGateNow: true });
  });

  it("returns { renderCard: false, closeGateNow: true } when eligible and variant is control (suppressed, gate closes so it never re-evaluates)", () => {
    expect(
      decideWhatYouLearnedCard({ eligible: true, variant: "control", alreadySeen: false })
    ).toEqual({ renderCard: false, closeGateNow: true });
  });
});

describe("getExperimentVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined when consent is null (not yet given)", () => {
    mockGetConsent.mockReturnValue(null);
    expect(getExperimentVariant("wjl_retention_ab")).toBeUndefined();
  });

  it("returns undefined when consent is declined", () => {
    mockGetConsent.mockReturnValue("declined");
    expect(getExperimentVariant("wjl_retention_ab")).toBeUndefined();
  });

  it("returns undefined when posthog throws", () => {
    mockGetConsent.mockReturnValue("accepted");
    mockPosthog.getFeatureFlag.mockImplementation(() => {
      throw new Error("PostHog unavailable");
    });
    expect(getExperimentVariant("wjl_retention_ab")).toBeUndefined();
  });

  it("returns undefined when posthog returns a boolean (flag resolved as boolean, not a variant)", () => {
    mockGetConsent.mockReturnValue("accepted");
    mockPosthog.getFeatureFlag.mockReturnValue(false);
    expect(getExperimentVariant("wjl_retention_ab")).toBeUndefined();
  });

  it("returns undefined when posthog returns an unrecognised string variant", () => {
    mockGetConsent.mockReturnValue("accepted");
    mockPosthog.getFeatureFlag.mockReturnValue("other-variant");
    expect(getExperimentVariant("wjl_retention_ab")).toBeUndefined();
  });

  it("returns undefined when posthog returns undefined (flag not yet resolved)", () => {
    mockGetConsent.mockReturnValue("accepted");
    mockPosthog.getFeatureFlag.mockReturnValue(undefined);
    expect(getExperimentVariant("wjl_retention_ab")).toBeUndefined();
  });

  it("returns control when posthog returns the control variant", () => {
    mockGetConsent.mockReturnValue("accepted");
    mockPosthog.getFeatureFlag.mockReturnValue("control");
    expect(getExperimentVariant("wjl_retention_ab")).toBe("control");
  });

  it("returns test when posthog returns the test variant", () => {
    mockGetConsent.mockReturnValue("accepted");
    mockPosthog.getFeatureFlag.mockReturnValue("test");
    expect(getExperimentVariant("wjl_retention_ab")).toBe("test");
  });

  it("returns the dev-override variant without consulting consent or posthog", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_DEV_FORCE_WJL_VARIANT", "test");
    expect(getExperimentVariant("wjl_retention_ab")).toBe("test");
    expect(mockGetConsent).not.toHaveBeenCalled();
    expect(mockPosthog.getFeatureFlag).not.toHaveBeenCalled();
  });

  it("returns control from the dev-override", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_DEV_FORCE_WJL_VARIANT", "control");
    expect(getExperimentVariant("wjl_retention_ab")).toBe("control");
  });

  it("ignores a dev-override with an unrecognised value and falls through to the consent check", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_DEV_FORCE_WJL_VARIANT", "garbage");
    mockGetConsent.mockReturnValue(null);
    expect(getExperimentVariant("wjl_retention_ab")).toBeUndefined();
    expect(mockGetConsent).toHaveBeenCalled();
  });

  it("does not apply the dev-override outside a dev environment", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEV_FORCE_WJL_VARIANT", "test");
    mockGetConsent.mockReturnValue("accepted");
    mockPosthog.getFeatureFlag.mockReturnValue("control");
    expect(getExperimentVariant("wjl_retention_ab")).toBe("control");
  });

  it("returns the dev-override variant for onboarding_ab without consulting consent or posthog", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_DEV_FORCE_ONBOARDING_AB_VARIANT", "test");
    expect(getExperimentVariant("onboarding_ab")).toBe("test");
    expect(mockGetConsent).not.toHaveBeenCalled();
    expect(mockPosthog.getFeatureFlag).not.toHaveBeenCalled();
  });

  it("returns control from the onboarding_ab dev-override", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_DEV_FORCE_ONBOARDING_AB_VARIANT", "control");
    expect(getExperimentVariant("onboarding_ab")).toBe("control");
  });

  it("does not cross-apply the wjl dev-override to onboarding_ab", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_DEV_FORCE_WJL_VARIANT", "test");
    mockGetConsent.mockReturnValue(null);
    expect(getExperimentVariant("onboarding_ab")).toBeUndefined();
  });
});

describe("onExperimentFlagsReady", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes the callback immediately and never subscribes when consent is not accepted", () => {
    mockGetConsent.mockReturnValue(null);
    const callback = vi.fn();

    const unsubscribe = onExperimentFlagsReady(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(mockPosthog.onFeatureFlags).not.toHaveBeenCalled();
    expect(typeof unsubscribe).toBe("function");
  });

  it("subscribes via posthog.onFeatureFlags and fires the callback once flags load when consent is accepted", () => {
    mockGetConsent.mockReturnValue("accepted");
    const teardown: () => void = vi.fn();
    mockPosthog.onFeatureFlags.mockImplementation((cb) => {
      (cb as () => void)();
      return teardown;
    });
    const callback = vi.fn();

    const unsubscribe = onExperimentFlagsReady(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(mockPosthog.onFeatureFlags).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it("falls back to invoking the callback when posthog.onFeatureFlags throws", () => {
    mockGetConsent.mockReturnValue("accepted");
    mockPosthog.onFeatureFlags.mockImplementation(() => {
      throw new Error("PostHog unavailable");
    });
    const callback = vi.fn();

    expect(() => onExperimentFlagsReady(callback)).not.toThrow();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
