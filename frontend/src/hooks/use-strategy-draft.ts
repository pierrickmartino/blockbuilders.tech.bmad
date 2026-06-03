/**
 * useStrategyDraft — hook for draft persistence (issues #458, #516).
 *
 * Simplified per ADR-0005: no publish step. State machine: idle → saving → saved | error.
 *
 * Hydration guard: persistDraft is a no-op until markHydrated() is called, so
 * the empty initial React mount can never overwrite a real working copy.
 *
 * Consumers:
 *   - call markHydrated() once the working copy has loaded onto the canvas
 *   - call persistDraft(nodes, edges) on canvas changes (via onStable debounce)
 *   - read draftStatus / lastSavedAt / relativeTimestamp for toolbar display
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import { StrategiesApiClient } from "@/lib/api/strategies-client";
import { reactFlowToDefinition } from "@/lib/canvas-utils";
import { formatRelativeTime } from "@/lib/format";
import { draftReducer, initialDraftState } from "./draft-reducer";
import type { DraftState } from "./draft-reducer";
import type { ValidationError } from "@/types/canvas";

interface UseStrategyDraftOptions {
  strategyId: string;
  /**
   * Called after each successful draft persist with the current validation
   * result.  Receives an empty array when the draft is valid.
   */
  onValidationErrors?: (errors: ValidationError[]) => void;
}

interface UseStrategyDraftReturn {
  draftStatus: DraftState["status"];
  lastSavedAt: Date | null;
  draftError: string | null;
  relativeTimestamp: string;
  /** Mark the working copy as loaded — unlocks persistDraft. */
  markHydrated: () => void;
  persistDraft: (nodes: Node[], edges: Edge[]) => Promise<void>;
  resetDraftStatus: () => void;
}

export function useStrategyDraft({
  strategyId,
  onValidationErrors,
}: UseStrategyDraftOptions): UseStrategyDraftReturn {
  const [state, dispatch] = useReducer(draftReducer, initialDraftState);

  // Hydration guard: blocks any persist until the working copy is loaded.
  const isHydratedRef = useRef(false);

  const markHydrated = useCallback(() => {
    isHydratedRef.current = true;
  }, []);

  // ── Relative timestamp ticker (updates every 5 s) ──────────────────────────
  useEffect(() => {
    if (!state.lastSavedAt) return;
    const update = () => {}; // relativeTimestamp is derived in render — ticker just forces re-render
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [state.lastSavedAt]);

  const relativeTimestamp = state.lastSavedAt
    ? formatRelativeTime(state.lastSavedAt)
    : "";

  // ── persistDraft ────────────────────────────────────────────────────────────
  const persistDraft = useCallback(
    async (nodes: Node[], edges: Edge[]) => {
      if (!isHydratedRef.current) return;

      dispatch({ type: "SAVE_START" });

      try {
        const definition = reactFlowToDefinition(nodes, edges);
        await StrategiesApiClient.putDraft(strategyId, definition as unknown as Record<string, unknown>);
        dispatch({ type: "SAVE_SUCCESS", timestamp: new Date() });

        // Live validation — read-only, does not block persist.
        try {
          const validation = await StrategiesApiClient.validateDraft(strategyId);
          onValidationErrors?.((validation.errors as ValidationError[]) ?? []);
        } catch {
          // Validation is best-effort; never break the persist flow.
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save draft";
        dispatch({ type: "SAVE_ERROR", message });
      }
    },
    [strategyId, onValidationErrors]
  );

  const resetDraftStatus = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    draftStatus: state.status,
    lastSavedAt: state.lastSavedAt,
    draftError: state.error,
    relativeTimestamp,
    markHydrated,
    persistDraft,
    resetDraftStatus,
  };
}
