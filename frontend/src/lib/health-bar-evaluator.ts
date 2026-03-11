import type { Node, Edge } from "@xyflow/react";
import type { RiskBlockType } from "@/types/canvas";

export type SegmentStatus = "complete" | "incomplete" | "warning";

export interface HealthBarState {
  entry: SegmentStatus;
  exit: SegmentStatus;
  risk: SegmentStatus;
}

const RISK_BLOCK_TYPES: RiskBlockType[] = [
  "position_size",
  "stop_loss",
  "take_profit",
  "trailing_stop",
  "max_drawdown",
  "time_exit",
];

function hasConnectedSignal(
  signalType: string,
  nodes: Node[],
  edges: Edge[]
): boolean {
  const signalNode = nodes.find((n) => n.type === signalType);
  if (!signalNode) return false;
  return edges.some((e) => e.target === signalNode.id);
}

/**
 * Evaluate strategy completeness for the Health Bar.
 * Mirrors backend validation rules for MISSING_ENTRY, MISSING_EXIT, UNCONNECTED_SIGNAL.
 * Risk is advisory-only in v1 (warning when absent, never incomplete).
 */
export function evaluateHealthBar(nodes: Node[], edges: Edge[]): HealthBarState {
  const entry: SegmentStatus = hasConnectedSignal("entry_signal", nodes, edges)
    ? "complete"
    : "incomplete";

  const exit: SegmentStatus = hasConnectedSignal("exit_signal", nodes, edges)
    ? "complete"
    : "incomplete";

  const hasRiskBlock = nodes.some((n) =>
    RISK_BLOCK_TYPES.includes(n.type as RiskBlockType)
  );
  const risk: SegmentStatus = hasRiskBlock ? "complete" : "warning";

  return { entry, exit, risk };
}
