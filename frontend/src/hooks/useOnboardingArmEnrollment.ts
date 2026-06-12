import { useEffect, useMemo } from "react";
import {
  getExperimentVariant,
  ONBOARDING_AB_FLAG,
} from "@/lib/experiment-variant";
import { resolveOnboardingArm, type OnboardingArm } from "@/lib/onboarding-arm";
import { trackEvent } from "@/lib/analytics";

interface OnboardingUser {
  id: string;
  has_completed_onboarding: boolean;
}

export interface UseOnboardingArmEnrollmentResult {
  arm: OnboardingArm | null;
  route: string;
}

/**
 * Wires the OAuth-callback routing fork to the onboarding_ab experiment (ADR-0014).
 *
 * Reads the `onboarding_ab` variant exactly once, at the first render where
 * `user` is available — this is the routing-fork enrollment/exposure moment.
 * Calls the pure `resolveOnboardingArm` decider and, only when the decision
 * enrolls, fires the `onboarding_ab_enrolled` exposure event (carrying `arm`)
 * exactly once via the consent-gated `trackEvent`, keyed to `user.id`.
 *
 * Returns `null` until `user` is available.
 */
export function useOnboardingArmEnrollment(
  user: OnboardingUser | null,
  drafterEnabled: boolean
): UseOnboardingArmEnrollmentResult | null {
  const ready = user !== null;

  const decision = useMemo(() => {
    if (!user) return null;
    if (user.has_completed_onboarding) {
      return resolveOnboardingArm({
        variant: undefined,
        hasCompletedOnboarding: true,
        drafterEnabled,
      });
    }
    const variant = getExperimentVariant(ONBOARDING_AB_FLAG);
    return resolveOnboardingArm({
      variant,
      hasCompletedOnboarding: false,
      drafterEnabled,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!decision?.enroll) return;
    trackEvent("onboarding_ab_enrolled", { arm: decision.arm }, user?.id);
  }, [decision, user?.id]);

  if (!decision) return null;
  return { arm: decision.arm, route: decision.route };
}
