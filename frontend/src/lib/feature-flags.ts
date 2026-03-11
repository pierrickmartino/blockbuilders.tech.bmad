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
} as const;

export type CanvasFlagKey = (typeof CANVAS_FLAGS)[keyof typeof CANVAS_FLAGS];

export type CanvasFlags = Record<CanvasFlagKey, boolean>;

/**
 * Safely read a PostHog feature flag.
 * Returns `false` if consent is not given, PostHog is unavailable, or any error occurs.
 */
export function getFeatureFlag(key: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (getConsent() !== "accepted") return false;
    const value = posthog.isFeatureEnabled(key);
    return value === true;
  } catch {
    return false;
  }
}

/** Read all canvas feature flags at once. Returns false for any that fail. */
export function getCanvasFlags(): { flags: CanvasFlags; hadFallback: boolean } {
  let hadFallback = false;
  const flags = {} as CanvasFlags;

  for (const key of Object.values(CANVAS_FLAGS)) {
    try {
      flags[key] = getFeatureFlag(key);
    } catch {
      flags[key] = false;
      hadFallback = true;
    }
  }

  return { flags, hadFallback };
}
