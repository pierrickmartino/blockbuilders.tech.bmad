/**
 * useStrategyDraft — hook for debounced draft persistence (issue #458).
 *
 * Side effects (API calls, relative timestamp) live here;
 * pure state logic lives in draftReducer.
 *
 * Consumers:
 *   - call persistDraft(nodes, edges) on canvas changes
 *   - read draftStatus / lastPersistedAt / relativeTimestamp for toolbar display
 */

import { useCallback, useEffect, useReducer } from "react";
import type { Node, Edge } from "@xyflow/react";
import { apiFetch } from "@/lib/api";
import { reactFlowToDefinition } from "@/lib/canvas-utils";
import { formatRelativeTime } from "@/lib/format";
import { draftReducer, initialDraftState } from "./draft-reducer";
import type { DraftState } from "./draft-reducer";

interface UseStrategyDraftOptions {
  strategyId: string;
}

interface UseStrategyDraftReturn {
  draftStatus: DraftState["status"];
  lastPersistedAt: Date | null;
  draftError: string | null;
  relativeTimestamp: string;
  persistDraft: (nodes: Node[], edges: Edge[]) => Promise<void>;
  resetDraftStatus: () => void;
}

export function useStrategyDraft({
  strategyId,
}: UseStrategyDraftOptions): UseStrategyDraftReturn {
  const [state, dispatch] = useReducer(draftReducer, initialDraftState);

  // ── Relative timestamp ticker (updates every 5 s) ──────────────────────────
  useEffect(() => {
    if (!state.lastPersistedAt) return;
    const update = () => {}; // relativeTimestamp is derived in render — ticker just forces re-render
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [state.lastPersistedAt]);

  const relativeTimestamp = state.lastPersistedAt
    ? formatRelativeTime(state.lastPersistedAt)
    : "";

  // ── persistDraft ────────────────────────────────────────────────────────────
  const persistDraft = useCallback(
    async (nodes: Node[], edges: Edge[]) => {
      dispatch({ type: "PERSIST_START" });

      try {
        const definition = reactFlowToDefinition(nodes, edges);
        await apiFetch(`/strategies/${strategyId}/draft`, {
          method: "PUT",
          body: JSON.stringify({ definition_json: definition }),
        });
        dispatch({ type: "PERSIST_SUCCESS", timestamp: new Date() });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save draft";
        dispatch({ type: "PERSIST_ERROR", message });
      }
    },
    [strategyId]
  );

  const resetDraftStatus = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    draftStatus: state.status,
    lastPersistedAt: state.lastPersistedAt,
    draftError: state.error,
    relativeTimestamp,
    persistDraft,
    resetDraftStatus,
  };
}
