/**
 * useStrategyDraft — hook for draft persistence and publish (issues #458, #459).
 *
 * Side effects (API calls, relative timestamp) live here;
 * pure state logic lives in draftReducer.
 *
 * Consumers:
 *   - call persistDraft(nodes, edges) on canvas changes
 *   - call publishDraft() when user clicks Publish
 *   - read draftStatus / lastPersistedAt / relativeTimestamp for toolbar display
 */

import { useCallback, useEffect, useReducer } from "react";
import type { Node, Edge } from "@xyflow/react";
import { apiFetch } from "@/lib/api";
import { reactFlowToDefinition } from "@/lib/canvas-utils";
import { formatRelativeTime } from "@/lib/format";
import { draftReducer, initialDraftState } from "./draft-reducer";
import type { DraftState } from "./draft-reducer";
import type { ValidationError } from "@/types/canvas";

interface UseStrategyDraftOptions {
  strategyId: string;
  /** Called after a successful publish so the version list can be refreshed. */
  onPublishSuccess?: () => void;
  /**
   * Called after each successful draft persist with the current validation
   * result.  Receives an empty array when the draft is valid.
   */
  onValidationErrors?: (errors: ValidationError[]) => void;
}

interface UseStrategyDraftReturn {
  draftStatus: DraftState["status"];
  lastPersistedAt: Date | null;
  draftError: string | null;
  relativeTimestamp: string;
  hasDraft: boolean;
  persistDraft: (nodes: Node[], edges: Edge[]) => Promise<void>;
  publishDraft: () => Promise<void>;
  resetDraftStatus: () => void;
}

export function useStrategyDraft({
  strategyId,
  onPublishSuccess,
  onValidationErrors,
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

  // hasDraft is true once the draft has been persisted at least once this session
  // OR when a prior draft was loaded from the server (signalled by lastPersistedAt).
  const hasDraft =
    state.lastPersistedAt !== null ||
    state.status === "persisted" ||
    state.status === "persisting";

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

        // Live validation — read-only, does not block persist.
        // Errors are forwarded to the canvas via the callback.
        try {
          const validation = (await apiFetch(
            `/strategies/${strategyId}/draft/validate`,
            { method: "POST" }
          )) as { status: string; errors: ValidationError[] };
          onValidationErrors?.(validation.errors);
        } catch {
          // Validation is best-effort; never break the persist flow.
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save draft";
        dispatch({ type: "PERSIST_ERROR", message });
      }
    },
    [strategyId, onValidationErrors]
  );

  // ── publishDraft ─────────────────────────────────────────────────────────────
  const publishDraft = useCallback(async () => {
    dispatch({ type: "PUBLISH_START" });

    try {
      await apiFetch(`/strategies/${strategyId}/draft/publish`, {
        method: "POST",
      });
      dispatch({ type: "PUBLISH_SUCCESS" });
      onPublishSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to publish draft";
      dispatch({ type: "PUBLISH_ERROR", message });
    }
  }, [strategyId, onPublishSuccess]);

  const resetDraftStatus = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    draftStatus: state.status,
    lastPersistedAt: state.lastPersistedAt,
    draftError: state.error,
    relativeTimestamp,
    hasDraft,
    persistDraft,
    publishDraft,
    resetDraftStatus,
  };
}
