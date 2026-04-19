import type { Meta, StoryObj } from "@storybook/react";
import { DistributionRow } from "./DistributionRow";

const returnDistribution = [
  { label: "< -5%", count: 2, percentage: 5 },
  { label: "-5% to -2%", count: 4, percentage: 10 },
  { label: "-2% to 0%", count: 6, percentage: 15 },
  { label: "0% to 2%", count: 10, percentage: 25 },
  { label: "2% to 5%", count: 12, percentage: 30 },
  { label: "> 5%", count: 6, percentage: 15 },
];

const durationDistribution = [
  { label: "< 1h", count: 3, percentage: 8 },
  { label: "1h–6h", count: 8, percentage: 20 },
  { label: "6h–1d", count: 15, percentage: 38 },
  { label: "1d–3d", count: 10, percentage: 25 },
  { label: "> 3d", count: 4, percentage: 9 },
];

const meta = {
  title: "Backtest/DistributionRow",
  component: DistributionRow,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DistributionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    returnDistribution,
    durationDistribution,
    totalTrades: 40,
    durationDistributionTotal: 40,
    skewCallout: "",
    skew: 0.3,
  },
};

export const WithSkewWarning: Story = {
  args: {
    returnDistribution,
    durationDistribution,
    totalTrades: 40,
    durationDistributionTotal: 40,
    skewCallout: "Review risk controls",
  },
};

export const WithoutDuration: Story = {
  args: {
    returnDistribution,
    durationDistribution: null,
    totalTrades: 40,
    durationDistributionTotal: 0,
    skewCallout: "",
  },
};

export const Empty: Story = {
  args: {
    returnDistribution: [],
    durationDistribution: null,
    totalTrades: 0,
    durationDistributionTotal: 0,
    skewCallout: "",
  },
};

export const Dark: Story = {
  args: {
    returnDistribution,
    durationDistribution,
    totalTrades: 40,
    durationDistributionTotal: 40,
    skewCallout: "",
    skew: 0.3,
  },
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6">
        <Story />
      </div>
    ),
  ],
};
