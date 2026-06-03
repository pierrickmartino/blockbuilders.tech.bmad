/**
 * draftReducer — pure state machine for strategy draft persistence (issue #516).
 *
 * State machine: idle → saving → saved | error
 * Publish states removed per ADR-0005 (no publish step in simplified lifecycle).
 *
 * All side effects live in useStrategyDraft; this file has zero dependencies.
 */

export type DraftStatus = "idle" | "saving" | "saved" | "error";

export interface DraftState {
  status: DraftStatus;
  lastSavedAt: Date | null;
  error: string | null;
}

export type DraftAction =
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS"; timestamp: Date }
  | { type: "SAVE_ERROR"; message: string }
  | { type: "RESET" };

export const initialDraftState: DraftState = {
  status: "idle",
  lastSavedAt: null,
  error: null,
};

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "SAVE_START":
      return { ...state, status: "saving", error: null };

    case "SAVE_SUCCESS":
      return {
        ...state,
        status: "saved",
        lastSavedAt: action.timestamp,
        error: null,
      };

    case "SAVE_ERROR":
      return {
        ...state,
        status: "error",
        error: action.message,
      };

    case "RESET":
      return { ...initialDraftState };

    default:
      return state;
  }
}
