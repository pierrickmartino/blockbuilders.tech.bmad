"use client";

import { createContext, useContext, useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import { evaluateHealthBar, type HealthBarState } from "@/lib/health-bar-evaluator";
import { computeRollup, type RollupStatus } from "@/lib/readiness-rollup";

interface ReadinessValue {
  rollup: RollupStatus;
  segments: HealthBarState;
}

const ReadinessContext = createContext<ReadinessValue | null>(null);

interface ReadinessProviderProps {
  nodes: Node[];
  edges: Edge[];
  children: React.ReactNode;
}

export function ReadinessProvider({ nodes, edges, children }: ReadinessProviderProps) {
  const value = useMemo<ReadinessValue>(() => {
    const segments = evaluateHealthBar(nodes, edges);
    return { rollup: computeRollup(segments), segments };
  }, [nodes, edges]);

  return <ReadinessContext.Provider value={value}>{children}</ReadinessContext.Provider>;
}

export function useReadiness(): ReadinessValue {
  const ctx = useContext(ReadinessContext);
  if (ctx === null) {
    throw new Error("useReadiness must be used within a ReadinessProvider");
  }
  return ctx;
}

export function useReadinessSafe(): ReadinessValue | null {
  return useContext(ReadinessContext);
}
