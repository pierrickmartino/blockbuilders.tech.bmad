import type { Meta, StoryObj } from "@storybook/react";
import { PositionAnalysisCard } from "./PositionAnalysisCard";
import type { TradeDetail } from "@/types/backtest";

const makeTrade = (durationSec: number, entry = 100, qty = 1): TradeDetail =>
  ({
    entry_time: "2024-01-01T00:00:00Z",
    exit_time: "2024-01-02T00:00:00Z",
    duration_seconds: durationSec,
    entry_price: entry,
    qty,
  }) as unknown as TradeDetail;

const meta = {
  title: "Backtest/PositionAnalysisCard",
  component: PositionAnalysisCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-6 max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PositionAnalysisCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trades: [
      makeTrade(86400),
      makeTrade(3 * 86400),
      makeTrade(7 * 86400),
      makeTrade(12 * 3600),
    ],
    timeframe: "1d",
  },
};

export const Empty: Story = {
  args: { trades: [], timeframe: "1d" },
};

export const MissingTimestamps: Story = {
  args: {
    trades: [
      { ...makeTrade(0), duration_seconds: null } as unknown as TradeDetail,
      { ...makeTrade(0), duration_seconds: null } as unknown as TradeDetail,
    ],
    timeframe: "1d",
  },
};

export const Dark: Story = {
  args: {
    trades: [makeTrade(86400), makeTrade(3 * 86400), makeTrade(7 * 86400)],
    timeframe: "1d",
  },
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6 max-w-xl">
        <Story />
      </div>
    ),
  ],
};
