import type { StrategyEntryPath } from "@/types/strategy";

/** Sentinel cohort for a persisted `entry_path` that is `null` or unrecognised (ADR-0009). */
export const UNKNOWN_COHORT = "unknown" as const;

export type AuthoringMode = "nl" | "manual";

export interface Cohort {
  entry_path: StrategyEntryPath | typeof UNKNOWN_COHORT;
  authoring_mode: AuthoringMode | typeof UNKNOWN_COHORT;
}

/**
 * Resolve a strategy's persisted `entry_path` into the `{ entry_path,
 * authoring_mode }` pair every analytics event carries (ADR-0009). The sole
 * home of the cohort-derivation rule: `nl_wedge` is the only `nl`-authored
 * path, `null`/unrecognised values surface honestly as the `unknown` cohort
 * rather than being guessed or passed through as a real path.
 */
export function resolveCohort(entryPath: string | null): Cohort {
  switch (entryPath) {
    case "nl_wedge":
      return { entry_path: "nl_wedge", authoring_mode: "nl" };
    case "wizard":
    case "blank_canvas":
    case "template_clone":
      return { entry_path: entryPath, authoring_mode: "manual" };
    default:
      return { entry_path: UNKNOWN_COHORT, authoring_mode: UNKNOWN_COHORT };
  }
}
