export type DraftOutcome = "accepted" | "edited" | "kept" | "rejected";

export interface DraftReviewState {
  isUnderReview: boolean;
  outcome: DraftOutcome | null;
}

export type DraftReviewAction =
  | { type: "INIT" }
  | { type: "ACCEPT" }
  | { type: "EDIT" }
  | { type: "KEEP" }
  | { type: "REJECT" };

export const initialDraftReviewState: DraftReviewState = {
  isUnderReview: false,
  outcome: null,
};

const OUTCOME_BY_ACTION: Record<Exclude<DraftReviewAction["type"], "INIT">, DraftOutcome> = {
  ACCEPT: "accepted",
  EDIT: "edited",
  KEEP: "kept",
  REJECT: "rejected",
};

export function draftReviewReducer(
  state: DraftReviewState,
  action: DraftReviewAction
): DraftReviewState {
  switch (action.type) {
    case "INIT": {
      if (state.isUnderReview || state.outcome !== null) {
        return state;
      }
      return { isUnderReview: true, outcome: null };
    }
    case "ACCEPT":
    case "EDIT":
    case "KEEP":
    case "REJECT": {
      if (!state.isUnderReview) {
        return state;
      }
      return { isUnderReview: false, outcome: OUTCOME_BY_ACTION[action.type] };
    }
    default:
      return state;
  }
}
