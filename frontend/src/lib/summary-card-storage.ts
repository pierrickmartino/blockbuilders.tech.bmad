export const SUMMARY_CARD_KEY = "bb.first_run_summary_card_seen";

export function getSummaryCardSeen(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(SUMMARY_CARD_KEY) === "true"; }
  catch { return true; }
}

export function markSummaryCardSeen(): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SUMMARY_CARD_KEY, "true"); }
  catch { /* storage unavailable */ }
}
