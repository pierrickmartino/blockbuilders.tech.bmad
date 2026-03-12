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

// Must stay aligned with backend _collect_validation_errors exit_rule_types.
const EXIT_RISK_BLOCK_TYPES: RiskBlockType[] = [
  "time_exit",
  "trailing_stop",
  "stop_loss",
  "take_profit",
  "max_drawdown",
];

function getSignalConnectivity(
  signalType: string,
  nodes: Node[],
  connectedTargets: Set<string>
): { count: number; allConnected: boolean } {
  const signalNodes = nodes.filter((n) => n.type === signalType);
  return {
    count: signalNodes.length,
    allConnected: signalNodes.every((signalNode) => connectedTargets.has(signalNode.id)),
  };
}

/**
 * Evaluate strategy completeness for the Health Bar.
 * Mirrors backend validation rules for MISSING_ENTRY, MISSING_EXIT, UNCONNECTED_SIGNAL.
 * Risk is advisory-only in v1 (warning when absent, never incomplete).
 */
export function evaluateHealthBar(nodes: Node[], edges: Edge[]): HealthBarState {
  const connectedTargets = new Set(edges.map((edge) => edge.target));

  const entrySignals = getSignalConnectivity("entry_signal", nodes, connectedTargets);
  const entry: SegmentStatus = (entrySignals.count > 0 && entrySignals.allConnected)
    ? "complete"
    : "incomplete";

  const exitSignals = getSignalConnectivity("exit_signal", nodes, connectedTargets);
  const hasExitRiskBlock = nodes.some((n) =>
    EXIT_RISK_BLOCK_TYPES.includes(n.type as RiskBlockType)
  );
  const hasExitCondition = exitSignals.count > 0 || hasExitRiskBlock;
  const exit: SegmentStatus = (hasExitCondition && exitSignals.allConnected)
    ? "complete"
    : "incomplete";

  const hasRiskBlock = nodes.some((n) =>
    RISK_BLOCK_TYPES.includes(n.type as RiskBlockType)
  );
  const risk: SegmentStatus = hasRiskBlock ? "complete" : "warning";

  return { entry, exit, risk };
}
