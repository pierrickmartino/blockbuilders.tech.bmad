import type { Meta, StoryObj } from "@storybook/react";
import { buildEquitySparklinePath } from "@/lib/shared-backtest/build-equity-sparkline-path";
import type { EquityCurvePoint } from "@/types/backtest";
import {
  SharedBacktestOgCard,
  OG_SPARKLINE_WIDTH,
  OG_SPARKLINE_HEIGHT,
} from "./SharedBacktestOgCard";
import { SharedBacktestOgFallbackCard } from "./SharedBacktestOgFallbackCard";

function makeCurve(equities: number[]): EquityCurvePoint[] {
  return equities.map((equity, index) => ({
    timestamp: `2025-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
    equity,
  }));
}

const dimensions = { width: OG_SPARKLINE_WIDTH, height: OG_SPARKLINE_HEIGHT };

const meta = {
  title: "Share/SharedBacktestOgCard",
  component: SharedBacktestOgCard,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Dynamic per-result OG image for the Shared backtest (ADR-0019, M5). Strictly result-only — no strategy graph or idea/name.",
      },
    },
  },
} satisfies Meta<typeof SharedBacktestOgCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gain: Story = {
  args: {
    asset: "BTC/USDT",
    timeframe: "1d",
    totalReturnPct: 12.34,
    maxDrawdownPct: -5.5,
    sparklinePath: buildEquitySparklinePath(
      makeCurve([10000, 9800, 10500, 11200, 10900, 11234]),
      dimensions
    ),
  },
};

export const Loss: Story = {
  args: {
    asset: "ETH/USDT",
    timeframe: "4h",
    totalReturnPct: -8.5,
    maxDrawdownPct: -14.2,
    sparklinePath: buildEquitySparklinePath(
      makeCurve([10000, 10400, 9600, 8900, 9150]),
      dimensions
    ),
  },
};

export const FlatSingleTrade: Story = {
  args: {
    asset: "SOL/USDT",
    timeframe: "1h",
    totalReturnPct: 0,
    maxDrawdownPct: 0,
    sparklinePath: buildEquitySparklinePath(makeCurve([10000]), dimensions),
  },
};

export const ExpiredOrUnknownToken: Story = {
  args: Gain.args,
  render: () => <SharedBacktestOgFallbackCard />,
};
