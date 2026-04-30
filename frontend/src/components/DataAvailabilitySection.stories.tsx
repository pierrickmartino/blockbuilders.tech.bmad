import type { Meta, StoryObj } from "@storybook/react";
import { DataAvailabilitySection } from "./DataAvailabilitySection";
import type {
  DataAvailabilityResponse,
  DataCompletenessResponse,
  DataQualityMetrics,
} from "@/types/backtest";

const availability: DataAvailabilityResponse = {
  asset: "BTC/USDT",
  timeframe: "1h",
  earliest_date: "2024-01-01",
  latest_date: "2024-12-31",
  source: "binance_ohlcv",
};

const goodCompleteness: DataCompletenessResponse = {
  asset: "BTC/USDT",
  timeframe: "1h",
  coverage_start: "2024-01-01T00:00:00Z",
  coverage_end: "2024-12-31T00:00:00Z",
  completeness_percent: 100,
  gap_count: 0,
  gap_total_hours: 0,
  gap_ranges: [],
};

const goodQuality: DataQualityMetrics = {
  asset: "BTC/USDT",
  timeframe: "1h",
  date_from: "2024-03-01",
  date_to: "2024-09-01",
  gap_percent: 0,
  outlier_count: 0,
  volume_consistency: 99.5,
  has_issues: false,
  issues_description: "",
};

const withGapsCompleteness: DataCompletenessResponse = {
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
  ],
};

const withIssuesQuality: DataQualityMetrics = {
  asset: "BTC/USDT",
  timeframe: "1h",
  date_from: "2024-03-01",
  date_to: "2024-09-01",
  gap_percent: 3.2,
  outlier_count: 2,
  volume_consistency: 94.1,
  has_issues: true,
  issues_description: "3 data gaps detected totalling 113 hours",
};

const meta = {
  title: "Components/DataAvailabilitySection",
  component: DataAvailabilitySection,
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true },
    docs: {
      description: {
        component:
          "Collapsible accordion on the backtest results page showing historical OHLCV data quality for the selected asset and timeframe. Warns the user about gaps that may affect backtest accuracy.",
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
} satisfies Meta<typeof DataAvailabilitySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoIssues: Story = {
  args: {
    dataAvailability: availability,
    completeness: goodCompleteness,
    dataQuality: goodQuality,
    gapOverlap: null,
    dateFrom: "2024-03-01",
    dateTo: "2024-09-01",
  },
};

export const WithIssues: Story = {
  args: {
    dataAvailability: availability,
    completeness: withGapsCompleteness,
    dataQuality: withIssuesQuality,
    gapOverlap: [{ start: "2024-06-01", end: "2024-06-03" }],
    dateFrom: "2024-03-01",
    dateTo: "2024-09-01",
  },
};

export const NullData: Story = {
  args: {
    dataAvailability: null,
    completeness: null,
    dataQuality: null,
    gapOverlap: null,
    dateFrom: "2024-03-01",
    dateTo: "2024-09-01",
  },
};
