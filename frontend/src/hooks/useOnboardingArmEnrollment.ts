import { useEffect, useRef, useState } from "react";
import {
  getExperimentVariant,
  onExperimentFlagsReady,
  ONBOARDING_AB_FLAG,
} from "@/lib/experiment-variant";
import {
  getFeatureFlag,
  STRATEGY_DRAFTER_ENABLED_FLAG,
} from "@/lib/feature-flags";
import {
  resolveOnboardingArm,
  type OnboardingArm,
  type ResolveOnboardingArmOutput,
} from "@/lib/onboarding-arm";
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
 * Safety net: if PostHog flags stall (consent accepted but the SDK never
 * resolves them — e.g. a blocked network), resolve the routing fork anyway so
 * a fresh signup is never stranded on the callback screen without a route.
 */
const FLAGS_RESOLUTION_TIMEOUT_MS = 3000;

/**
 * Wires the OAuth-callback routing fork to the onboarding_ab experiment (ADR-0014).
 *
 * Defers the routing-fork enrollment until PostHog feature flags have loaded,
 * then reads **both** the `strategy_drafter_enabled` kill-switch and the
 * `onboarding_ab` variant exactly once. Reading either at first render would
 * freeze it before flags load and lock fresh OAuth signups into "wizard, no
 * enrollment" (drafter reads `false`, variant reads `undefined`), undercounting
 * the A/B test. Calls the pure `resolveOnboardingArm` decider and, only when
 * the decision enrolls, fires the `onboarding_ab_enrolled` exposure event
 * (carrying `arm`) exactly once via the consent-gated `trackEvent`, keyed to
 * `user.id`.
 *
 * Returns `null` until `user` is available and the decision has resolved.
 */
export function useOnboardingArmEnrollment(
  user: OnboardingUser | null
): UseOnboardingArmEnrollmentResult | null {
  const [decision, setDecision] = useState<ResolveOnboardingArmOutput | null>(
    null
  );
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (resolvedRef.current || !user) return;

    // Already-onboarded users bypass the experiment entirely; neither the
    // kill-switch nor the variant matters, so resolve immediately.
    if (user.has_completed_onboarding) {
      resolvedRef.current = true;
      setDecision(
        resolveOnboardingArm({
          variant: undefined,
          hasCompletedOnboarding: true,
          drafterEnabled: false,
        })
      );
      return;
    }

    // New signup: wait for PostHog flags so we read the assigned variant and
    // the kill-switch from loaded flags rather than their pre-load defaults.
    // `resolve` is idempotent — whichever of the flags-ready callback or the
    // timeout fires first wins.
    const resolve = () => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      setDecision(
        resolveOnboardingArm({
          variant: getExperimentVariant(ONBOARDING_AB_FLAG),
          hasCompletedOnboarding: false,
          drafterEnabled: getFeatureFlag(STRATEGY_DRAFTER_ENABLED_FLAG),
        })
      );
    };

    const unsubscribe = onExperimentFlagsReady(resolve);
    const timeout = setTimeout(resolve, FLAGS_RESOLUTION_TIMEOUT_MS);
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [user]);

  useEffect(() => {
    if (!decision?.enroll) return;
    trackEvent("onboarding_ab_enrolled", { arm: decision.arm }, user?.id);
  }, [decision, user?.id]);

  if (!decision) return null;
  return { arm: decision.arm, route: decision.route };
}
