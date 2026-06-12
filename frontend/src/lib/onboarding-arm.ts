import type { ExperimentVariant } from "./experiment-variant";

/** The Onboarding arm: the assigned surface a new user is routed to (ADR-0014, CONTEXT.md). */
export type OnboardingArm = "wizard" | "nl_wedge";

export const WIZARD_ROUTE = "/strategies?wizard=true";
export const NL_WEDGE_ROUTE = "/strategies/draft";
export const ONBOARDED_ROUTE = "/dashboard";

export interface ResolveOnboardingArmInput {
  variant: ExperimentVariant | undefined;
  hasCompletedOnboarding: boolean;
  drafterEnabled: boolean;
}

export interface ResolveOnboardingArmOutput {
  arm: OnboardingArm | null;
  route: string;
  enroll: boolean;
}

/**
 * Pure decision function for the onboarding A/B routing fork (ADR-0014).
 * Encodes the truth table exactly. No React, no PostHog SDK, no side effects.
 */
export function resolveOnboardingArm({
  variant,
  hasCompletedOnboarding,
  drafterEnabled,
}: ResolveOnboardingArmInput): ResolveOnboardingArmOutput {
  if (hasCompletedOnboarding) {
    return { arm: null, route: ONBOARDED_ROUTE, enroll: false };
  }

  if (!drafterEnabled) {
    return { arm: "wizard", route: WIZARD_ROUTE, enroll: false };
  }

  if (variant === "test") {
    return { arm: "nl_wedge", route: NL_WEDGE_ROUTE, enroll: true };
  }

  if (variant === "control") {
    return { arm: "wizard", route: WIZARD_ROUTE, enroll: true };
  }

  // variant === undefined: no/late consent, flag unresolved — default-routed, never enrolled
  return { arm: "wizard", route: WIZARD_ROUTE, enroll: false };
}
