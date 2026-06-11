import { useEffect, useReducer } from "react";
import { trackEvent } from "@/lib/analytics";
import { resolveCohort } from "@/lib/cohort-resolver";
import {
  draftReviewReducer,
  initialDraftReviewState,
  type DraftOutcome,
  type DraftReviewAction,
} from "@/lib/draft-review-reducer";
import { isDraftUnderReview, resolveDraftReview } from "@/lib/draft-review-storage";
import type { StrategyEntryPath } from "@/types/strategy";

interface UseDraftReviewStateOptions {
  strategyId: string;
  /** The loaded strategy's persisted `entry_path` (or `null`) — never a guess. */
  entryPath: StrategyEntryPath | null;
  userId?: string;
}

export interface UseDraftReviewStateResult {
  isUnderReview: boolean;
  outcome: DraftOutcome | null;
  accept: () => void;
  edit: () => void;
  keep: () => void;
  reject: () => void;
}

export function useDraftReviewState({
  strategyId,
  entryPath,
  userId,
}: UseDraftReviewStateOptions): UseDraftReviewStateResult {
  const [state, dispatch] = useReducer(draftReviewReducer, initialDraftReviewState);

  useEffect(() => {
    if (entryPath !== "nl_wedge") return;
    if (!isDraftUnderReview(strategyId)) return;

    dispatch({ type: "INIT" });
  }, [strategyId, entryPath]);

  const dispose = (action: Exclude<DraftReviewAction["type"], "INIT">, outcome: DraftOutcome): void => {
    if (!state.isUnderReview) return;

    dispatch({ type: action });
    resolveDraftReview(strategyId);
    const cohort = resolveCohort(entryPath);
    trackEvent(
      "nl_draft_outcome",
      {
        strategy_id: strategyId,
        outcome,
        entry_path: cohort.entry_path,
        authoring_mode: cohort.authoring_mode,
      },
      userId
    );
  };

  return {
    isUnderReview: state.isUnderReview,
    outcome: state.outcome,
    accept: () => dispose("ACCEPT", "accepted"),
    edit: () => dispose("EDIT", "edited"),
    keep: () => dispose("KEEP", "kept"),
    reject: () => dispose("REJECT", "rejected"),
  };
}
