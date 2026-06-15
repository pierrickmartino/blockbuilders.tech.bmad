/**
 * Pure helper for the "felt" dollar buy-and-hold delta shown in the
 * What-you-learned card. Mirrors the four loss-aware regimes encoded in
 * `backend/app/backtest/narrative.py::_felt_dollar_clause`.
 */

import { formatNumber } from "@/lib/format";

const SMALL_BAND_THRESHOLD_PP = 1;

export type FeltDeltaDirection = "positive" | "negative";

export interface FeltDollarDelta {
  amountUsd: string;
  direction: FeltDeltaDirection;
  /** Phrasing template containing an "{amount}" placeholder for the colored amount. */
  phrasing: string;
}

/**
 * Compute the felt-dollar buy-and-hold delta, or `null` when the strategy-vs-
 * benchmark delta falls within the small band (|delta| < 1 percentage point).
 */
export function getFeltDollarDelta(
  strategyReturnPct: number,
  benchmarkReturnPct: number,
  initialBalance: number
): FeltDollarDelta | null {
  const deltaPct = strategyReturnPct - benchmarkReturnPct;
  if (Math.abs(deltaPct) < SMALL_BAND_THRESHOLD_PP) {
    return null;
  }

  const feltDeltaUsd = (initialBalance * deltaPct) / 100;
  const amountUsd = `$${formatNumber(Math.abs(feltDeltaUsd), 0)}`;
  const direction: FeltDeltaDirection = feltDeltaUsd > 0 ? "positive" : "negative";
  const strategyIsUp = strategyReturnPct >= 0;

  let phrasing: string;
  if (strategyIsUp) {
    phrasing =
      feltDeltaUsd > 0
        ? "made you {amount} more than simply holding"
        : "cost you {amount} versus simply holding";
  } else {
    phrasing =
      feltDeltaUsd > 0
        ? "saved you {amount} — it lost less than holding would have"
        : "cost you {amount} more than simply holding";
  }

  return { amountUsd, direction, phrasing };
}
