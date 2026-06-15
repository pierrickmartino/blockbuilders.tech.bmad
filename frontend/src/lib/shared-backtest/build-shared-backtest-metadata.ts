import type { Metadata } from "next";
import { formatPercent } from "@/lib/format";
import type { PublicBacktestView } from "@/types/backtest";

const SITE_NAME = "Blockbuilders";

function describeOutcome(totalReturnPct: number): string {
  const magnitude = formatPercent(Math.abs(totalReturnPct));

  if (totalReturnPct > 0) return `gained ${magnitude}`;
  if (totalReturnPct < 0) return `lost ${magnitude}`;
  return `was flat at ${magnitude}`;
}

export function buildSharedBacktestMetadata(
  publicView: PublicBacktestView | null,
  token: string
): Metadata {
  if (!publicView) {
    return {
      title: `Shared backtest not found — ${SITE_NAME}`,
      description: "This shared backtest link has expired or doesn't exist.",
      robots: { index: false, follow: false },
    };
  }

  const { asset, timeframe, summary } = publicView;
  const outcome = describeOutcome(summary.total_return_pct);

  const title = `${asset} ${timeframe} backtest ${outcome} — ${SITE_NAME}`;
  const description = `A Blockbuilders backtest on ${asset} (${timeframe}) ${outcome} over the simulated period. See the full result and equity curve — strategy logic stays private.`;
  const url = `/share/backtests/${token}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
