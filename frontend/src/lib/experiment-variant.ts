import posthog from "posthog-js";
import { getConsent } from "./analytics";

export const WJL_EXPERIMENT_FLAG = "wjl_retention_ab" as const;
export const ONBOARDING_AB_FLAG = "onboarding_ab" as const;

export type ExperimentVariant = "control" | "test";

export interface CardDecisionInput {
  eligible: boolean;
  variant: ExperimentVariant | undefined;
  alreadySeen: boolean;
}

export interface CardDecisionOutput {
  renderCard: boolean;
  closeGateNow: boolean;
}

function isDevEnvironment(): boolean {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (appEnv === "development" || appEnv === "dev" || appEnv === "local") {
    return true;
  }
  return process.env.NODE_ENV === "development";
}

function getDevVariantOverride(key: string): ExperimentVariant | undefined {
  if (!isDevEnvironment()) return undefined;
  let raw: string | undefined;
  if (key === WJL_EXPERIMENT_FLAG) {
    raw = process.env.NEXT_PUBLIC_DEV_FORCE_WJL_VARIANT?.trim().toLowerCase();
  } else if (key === ONBOARDING_AB_FLAG) {
    raw = process.env.NEXT_PUBLIC_DEV_FORCE_ONBOARDING_AB_VARIANT?.trim().toLowerCase();
  }
  if (raw === "control" || raw === "test") return raw;
  return undefined;
}

/**
 * Variant-aware PostHog flag reader for experiments (ADR-0010).
 * Returns "control" | "test" | undefined.
 * Returns undefined on no-consent, PostHog-not-ready, unresolved/garbage flag value, or error.
 * The boolean getFeatureFlag and canvas_flag_* behavior are unaffected.
 */
export function getExperimentVariant(key: string): ExperimentVariant | undefined {
  if (typeof window === "undefined") return undefined;

  const devOverride = getDevVariantOverride(key);
  if (devOverride !== undefined) return devOverride;

  if (getConsent() !== "accepted") return undefined;

  try {
    const value = posthog.getFeatureFlag(key);
    if (value === "control" || value === "test") return value;
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Pure decision function for the WhatYouLearnedCard A/B experiment (ADR-0010).
 * Encodes the truth table exactly. No React, no PostHog SDK, no side effects.
 */
export function decideWhatYouLearnedCard({
  eligible,
  variant,
  alreadySeen,
}: CardDecisionInput): CardDecisionOutput {
  if (alreadySeen) return { renderCard: false, closeGateNow: false };
  if (!eligible) return { renderCard: false, closeGateNow: false };

  if (variant === "control") return { renderCard: false, closeGateNow: true };
  if (variant === "test") return { renderCard: true, closeGateNow: true };

  // undefined: unenrolled / no consent — preserves today's persist-until-dismissed behavior
  return { renderCard: true, closeGateNow: false };
}
