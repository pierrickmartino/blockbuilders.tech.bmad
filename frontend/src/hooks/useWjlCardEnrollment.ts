import { useEffect, useMemo } from "react";
import {
  decideWhatYouLearnedCard,
  getExperimentVariant,
  WJL_EXPERIMENT_FLAG,
} from "@/lib/experiment-variant";
import { markSummaryCardSeen } from "@/lib/summary-card-storage";

/**
 * Wires the WhatYouLearnedCard to the wjl_retention_ab experiment (ADR-0010).
 *
 * `eligible` must reflect the card's existing render conjunction (completed,
 * non-zero-trade run, with summary, first-run gate open, benchmark present).
 * The variant is read exactly once, at the first render where `eligible` is
 * true — this is the enrollment/exposure moment, so benchmark-null first runs
 * never enroll.
 *
 * Returns whether the card should render. When the decision closes the
 * first-run gate (`closeGateNow`), the persistent gate is closed via
 * `markSummaryCardSeen()`; for the control arm (card suppressed), the
 * optional `onSuppressSession` callback additionally clears the in-session
 * gate so the suppressed state takes effect immediately.
 */
export function useWjlCardEnrollment(
  eligible: boolean,
  onSuppressSession?: () => void
): boolean {
  const decision = useMemo(() => {
    if (!eligible) return null;
    const variant = getExperimentVariant(WJL_EXPERIMENT_FLAG);
    return decideWhatYouLearnedCard({ eligible: true, variant, alreadySeen: false });
  }, [eligible]);

  useEffect(() => {
    if (!decision?.closeGateNow) return;

    markSummaryCardSeen();
    if (!decision.renderCard) {
      onSuppressSession?.();
    }
  }, [decision, onSuppressSession]);

  return decision?.renderCard ?? false;
}
