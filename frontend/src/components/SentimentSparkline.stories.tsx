import type { Meta, StoryObj } from "@storybook/react";
import { SentimentSparkline } from "./SentimentSparkline";
import type { HistoryPoint } from "@/types/market";

const history: HistoryPoint[] = Array.from({ length: 14 }, (_, i) => ({
  t: `2024-01-${String(i + 1).padStart(2, "0")}`,
  v: 0.5 + Math.sin(i / 2) * 0.3,
}));

const meta = {
  title: "Components/SentimentSparkline",
  component: SentimentSparkline,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-6 max-w-xs">
        <Story />
      </div>
    ),
  ],
  args: {
    label: "Long/Short Ratio (7d)",
  },
} satisfies Meta<typeof SentimentSparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { history, status: "ok", color: "blue" },
};

export const Partial: Story = {
  args: { history, status: "partial", color: "amber" },
};

export const Empty: Story = {
  args: { history: [], status: "ok" },
};

export const Unavailable: Story = {
  args: { history: [], status: "unavailable" },
};

export const Dark: Story = {
  args: { history, status: "ok", color: "emerald" },
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6 max-w-xs">
        <Story />
      </div>
    ),
  ],
};
