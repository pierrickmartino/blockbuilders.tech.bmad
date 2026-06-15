import { ImageResponse } from "next/og";
import { getSharedBacktestView } from "@/lib/shared-backtest/get-shared-backtest-view";
import { buildEquitySparklinePath } from "@/lib/shared-backtest/build-equity-sparkline-path";
import {
  SharedBacktestOgCard,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  OG_SPARKLINE_WIDTH,
  OG_SPARKLINE_HEIGHT,
} from "./_components/SharedBacktestOgCard";
import { SharedBacktestOgFallbackCard } from "./_components/SharedBacktestOgFallbackCard";

export const size = { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT };
export const contentType = "image/png";

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * Dynamic per-result OG image for the Shared backtest (ADR-0019, M5).
 * Renders the actual asset, timeframe, return, drawdown, and equity
 * sparkline — strictly result-only, no strategy graph or idea/name.
 */
export default async function Image({ params }: Props) {
  const { token } = await params;
  const data = await getSharedBacktestView(token);

  if (!data) {
    return new ImageResponse(<SharedBacktestOgFallbackCard />, size);
  }

  const sparklinePath = buildEquitySparklinePath(data.equity_curve, {
    width: OG_SPARKLINE_WIDTH,
    height: OG_SPARKLINE_HEIGHT,
  });

  return new ImageResponse(
    (
      <SharedBacktestOgCard
        asset={data.asset}
        timeframe={data.timeframe}
        totalReturnPct={data.summary.total_return_pct}
        maxDrawdownPct={data.summary.max_drawdown_pct}
        sparklinePath={sparklinePath}
      />
    ),
    size
  );
}
