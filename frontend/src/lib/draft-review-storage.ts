const DRAFT_REVIEW_KEY_PREFIX = "bb.nl_draft_review:";
const UNDER_REVIEW_VALUE = "reviewing";

function draftReviewKey(strategyId: string): string {
  return `${DRAFT_REVIEW_KEY_PREFIX}${strategyId}`;
}

export function markDraftUnderReview(strategyId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(draftReviewKey(strategyId), UNDER_REVIEW_VALUE);
  } catch {
    /* storage unavailable */
  }
}

export function isDraftUnderReview(strategyId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(draftReviewKey(strategyId)) === UNDER_REVIEW_VALUE;
  } catch {
    return false;
  }
}

export function resolveDraftReview(strategyId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(draftReviewKey(strategyId));
  } catch {
    /* storage unavailable */
  }
}
