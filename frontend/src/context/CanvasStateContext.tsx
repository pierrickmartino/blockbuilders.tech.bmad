"use client";

import React, { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { canvasReducer, createInitialState, type CanvasAction, type CanvasState } from "@/lib/canvas-reducer";
import { useCanvasHistory } from "@/hooks/use-canvas-history";

interface CanvasStateContextValue {
  state: CanvasState;
  dispatch: (action: CanvasAction | { type: "UNDO" } | { type: "REDO" }) => void;
  canUndo: boolean;
  canRedo: boolean;
  resetHistory: (nodes: Node[], edges: Edge[]) => void;
  flushSnapshot: () => void;
  commitSnapshot: (nodes: Node[], edges: Edge[]) => void;
  stableTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

const CanvasStateContext = createContext<CanvasStateContextValue | null>(null);

interface CanvasStateProviderProps {
  children: React.ReactNode;
  onStable?: (nodes: Node[], edges: Edge[]) => void;
  initialNodes?: Node[];
  initialEdges?: Edge[];
}

export function CanvasStateProvider({
  children,
  onStable,
  initialNodes,
  initialEdges,
}: CanvasStateProviderProps) {
  const [state, realDispatch] = useReducer(
    canvasReducer,
    createInitialState(initialNodes, initialEdges)
  );

  const canvasHistory = useCanvasHistory({ onStable });

  useEffect(() => {
    canvasHistory.scheduleSnapshot(state.nodes, state.edges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nodes, state.edges]);

  const dispatch = useCallback(
    (action: CanvasAction | { type: "UNDO" } | { type: "REDO" }) => {
      if (action.type === "UNDO") {
        const snapshot = canvasHistory.undo();
        if (snapshot) {
          realDispatch({ type: "UNDO", payload: snapshot });
        }
        return;
      }

      if (action.type === "REDO") {
        const snapshot = canvasHistory.redo();
        if (snapshot) {
          realDispatch({ type: "REDO", payload: snapshot });
        }
        return;
      }

      realDispatch(action as CanvasAction);
    },
    [canvasHistory]
  );

  return (
    <CanvasStateContext.Provider
      value={{
        state,
        dispatch,
        canUndo: canvasHistory.canUndo,
        canRedo: canvasHistory.canRedo,
        resetHistory: canvasHistory.reset,
        flushSnapshot: canvasHistory.flushSnapshot,
        commitSnapshot: canvasHistory.commitSnapshot,
        stableTimerRef: canvasHistory.stableTimerRef,
      }}
    >
      {children}
    </CanvasStateContext.Provider>
  );
}

export function useCanvasState(): CanvasStateContextValue {
  const ctx = useContext(CanvasStateContext);
  if (ctx === null) {
    throw new Error("useCanvasState must be used within a CanvasStateProvider");
  }
  return ctx;
}
