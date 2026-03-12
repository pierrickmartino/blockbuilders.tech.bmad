import posthog from "posthog-js";
import { getConsent } from "./analytics";

/** Centralized canvas feature-flag keys (must match PostHog project). */
export const CANVAS_FLAGS = {
  history: "canvas_flag_history",
  autosave: "canvas_flag_autosave",
  copyPaste: "canvas_flag_copy_paste",
  minimap: "canvas_flag_minimap",
  autoLayout: "canvas_flag_auto_layout",
  shortcuts: "canvas_flag_shortcuts",
  healthBar: "canvas_flag_health_bar",
} as const;

export type CanvasFlagKey = (typeof CANVAS_FLAGS)[keyof typeof CANVAS_FLAGS];

export type CanvasFlags = Record<CanvasFlagKey, boolean>;

type FeatureFlagReadResult = {
  value: boolean;
  usedFallback: boolean;
};

function isDevEnvironment(): boolean {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (appEnv === "development" || appEnv === "dev" || appEnv === "local") {
    return true;
  }
  return process.env.NODE_ENV === "development";
}

function isDevHealthBarOverrideEnabled(key: string): boolean {
  if (!isDevEnvironment()) return false;
  if (key !== CANVAS_FLAGS.healthBar) return false;

  const raw = process.env.NEXT_PUBLIC_DEV_FORCE_CANVAS_FLAG_HEALTH_BAR;
  if (!raw) return false;

  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

function readFeatureFlag(key: string): FeatureFlagReadResult {
  if (typeof window === "undefined") {
    return { value: false, usedFallback: false };
  }

  // Local development escape hatch: allows iterating on Health Bar UI
  // without analytics consent and PostHog feature-flag plumbing.
  if (isDevHealthBarOverrideEnabled(key)) {
    return { value: true, usedFallback: false };
  }

  if (getConsent() !== "accepted") {
    return { value: false, usedFallback: false };
  }

  try {
    const value = posthog.isFeatureEnabled(key);
    if (value === true || value === false) {
      return { value, usedFallback: false };
    }
    return { value: false, usedFallback: true };
  } catch {
    return { value: false, usedFallback: true };
  }
}

/**
 * Safely read a PostHog feature flag.
 * Returns `false` if consent is not given, PostHog is unavailable, or any error occurs.
 */
export function getFeatureFlag(key: string): boolean {
  return readFeatureFlag(key).value;
}

/** Read all canvas feature flags at once. Returns false for any that fail. */
export function getCanvasFlags(): { flags: CanvasFlags; hadFallback: boolean } {
  let hadFallback = false;
  const flags = {} as CanvasFlags;

  for (const key of Object.values(CANVAS_FLAGS)) {
    const result = readFeatureFlag(key);
    flags[key] = result.value;
    hadFallback = hadFallback || result.usedFallback;
  }

  return { flags, hadFallback };
}
