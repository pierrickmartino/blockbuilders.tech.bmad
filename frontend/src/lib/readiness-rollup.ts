import type { HealthBarState } from "./health-bar-evaluator";

export type RollupStatus = "ready" | "warning" | "issue";

export function computeRollup(state: HealthBarState): RollupStatus {
  const values = [state.entry, state.exit, state.risk];
  if (values.some((s) => s === "incomplete")) return "issue";
  if (values.some((s) => s === "warning")) return "warning";
  return "ready";
}
