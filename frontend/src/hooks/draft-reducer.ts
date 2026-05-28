/**
 * draftReducer — pure state machine for strategy draft persistence and publish (issues #458, #459).
 *
 * Persist states:  idle → persisting → persisted | error
 * Publish states:  persisted → publishing → published | publishError
 *
 * All side effects live in useStrategyDraft; this file has zero dependencies.
 */

export type DraftStatus =
  | "idle"
  | "persisting"
  | "persisted"
  | "error"
  | "publishing"
  | "published"
  | "publishError";

export interface DraftState {
  status: DraftStatus;
  lastPersistedAt: Date | null;
  error: string | null;
}

export type DraftAction =
  | { type: "PERSIST_START" }
  | { type: "PERSIST_SUCCESS"; timestamp: Date }
  | { type: "PERSIST_ERROR"; message: string }
  | { type: "PUBLISH_START" }
  | { type: "PUBLISH_SUCCESS" }
  | { type: "PUBLISH_ERROR"; message: string }
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

    case "PUBLISH_START":
      return { ...state, status: "publishing", error: null };

    case "PUBLISH_SUCCESS":
      // Draft no longer exists after publish — reset lastPersistedAt
      return {
        ...state,
        status: "published",
        lastPersistedAt: null,
        error: null,
      };

    case "PUBLISH_ERROR":
      // Draft still exists; preserve lastPersistedAt so user knows it's safe
      return {
        ...state,
        status: "publishError",
        error: action.message,
      };

    case "RESET":
      return { ...initialDraftState };

    default:
      return state;
  }
}
