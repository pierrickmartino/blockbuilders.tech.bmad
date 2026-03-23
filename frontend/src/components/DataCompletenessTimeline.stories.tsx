import type { Meta, StoryObj } from "@storybook/react";
import { DataCompletenessTimeline } from "./DataCompletenessTimeline";
import type { DataCompletenessResponse } from "@/types/backtest";

const noGaps: DataCompletenessResponse = {
  asset: "BTC/USDT",
  timeframe: "1h",
  coverage_start: "2024-01-01T00:00:00Z",
  coverage_end: "2024-12-31T00:00:00Z",
  completeness_percent: 100,
  gap_count: 0,
  gap_total_hours: 0,
  gap_ranges: [],
};

const withGaps: DataCompletenessResponse = {
  asset: "BTC/USDT",
  timeframe: "1h",
  coverage_start: "2024-01-01T00:00:00Z",
  coverage_end: "2024-12-31T00:00:00Z",
  completeness_percent: 96.8,
  gap_count: 3,
  gap_total_hours: 113,
  gap_ranges: [
    { start: "2024-02-10T00:00:00Z", end: "2024-02-13T00:00:00Z" },
    { start: "2024-06-01T00:00:00Z", end: "2024-06-03T00:00:00Z" },
    { start: "2024-10-20T00:00:00Z", end: "2024-10-22T00:00:00Z" },
  ],
};

const noData: DataCompletenessResponse = {
  asset: "BTC/USDT",
  timeframe: "1h",
  coverage_start: null,
  coverage_end: null,
  completeness_percent: 0,
  gap_count: 0,
  gap_total_hours: 0,
  gap_ranges: [],
};

const meta = {
  title: "Components/DataCompletenessTimeline",
  component: DataCompletenessTimeline,
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true },
    docs: {
      description: {
        component:
          "Visual timeline bar showing historical OHLCV data availability for a given asset/timeframe. Green segments indicate available data; red segments indicate gaps. Gaps can be hovered to see their duration. Used in the Data Availability accordion on the backtest results page.",
      },
    },
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="p-6 max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DataCompletenessTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullCoverage: Story = {
  args: { data: noGaps },
};

export const WithGaps: Story = {
  args: { data: withGaps },
};

export const NoData: Story = {
  args: { data: noData },
};
