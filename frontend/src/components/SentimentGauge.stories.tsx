import type { Meta, StoryObj } from "@storybook/react";
import { SentimentGauge } from "./SentimentGauge";

const meta = {
  title: "Components/SentimentGauge",
  component: SentimentGauge,
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true },
    docs: {
      description: {
        component:
          "Displays a single market sentiment metric as a labeled card with a progress-bar gauge. Used inside MarketSentimentPanel for the Fear & Greed Index. Shows an 'Unavailable' badge when the data source is down and a 'Partial' indicator when data may be incomplete.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="p-6 max-w-xs">
        <Story />
      </div>
    ),
  ],
  args: {
    label: "Fear & Greed Index",
    min: 0,
    max: 100,
  },
} satisfies Meta<typeof SentimentGauge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fearful: Story = {
  args: { value: 22, status: "ok", formatter: (v) => `${v} – Fear` },
};

export const Neutral: Story = {
  args: { value: 50, status: "ok", formatter: (v) => `${v} – Neutral` },
};

export const Greedy: Story = {
  args: { value: 78, status: "ok", formatter: (v) => `${v} – Greed` },
};

export const ExtremeGreed: Story = {
  args: { value: 92, status: "ok", formatter: (v) => `${v} – Extreme Greed` },
};

export const PartialData: Story = {
  args: { value: 60, status: "partial", formatter: (v) => `${v}` },
};

export const Unavailable: Story = {
  args: { value: null, status: "unavailable" },
};

export const WithUnit: Story = {
  args: { value: 65, status: "ok", unit: "pts", formatter: (v) => `${v}` },
};
