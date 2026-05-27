/**
 * draftReducer — pure state machine for strategy draft persistence (issue #458).
 *
 * States: idle → persisting → persisted | error
 * All side effects live in useStrategyDraft; this file has zero dependencies.
 */

export type DraftStatus = "idle" | "persisting" | "persisted" | "error";

export interface DraftState {
  status: DraftStatus;
  lastPersistedAt: Date | null;
  error: string | null;
}

export type DraftAction =
  | { type: "PERSIST_START" }
  | { type: "PERSIST_SUCCESS"; timestamp: Date }
  | { type: "PERSIST_ERROR"; message: string }
  | { type: "RESET" };

export const initialDraftState: DraftState = {
  status: "idle",
  lastPersistedAt: null,
  error: null,
};

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "PERSIST_START":
      return { ...state, status: "persisting", error: null };

    case "PERSIST_SUCCESS":
      return {
        ...state,
        status: "persisted",
        lastPersistedAt: action.timestamp,
        error: null,
      };

    case "PERSIST_ERROR":
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
