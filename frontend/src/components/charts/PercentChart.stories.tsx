import type { Meta, StoryObj } from "@storybook/react";
import { PercentChart } from "./PercentChart";

const sample = [
  { date: "Jan", returnPct: 0 },
  { date: "Feb", returnPct: 5 },
  { date: "Mar", returnPct: 12 },
  { date: "Apr", returnPct: 9 },
  { date: "May", returnPct: 18 },
];

const meta: Meta<typeof PercentChart> = {
  title: "Charts/PercentChart",
  component: PercentChart,
};
export default meta;
type Story = StoryObj<typeof PercentChart>;

export const AreaDefault: Story = {
  args: { kind: "area", data: sample, index: "date", categories: ["returnPct"] },
};

export const Bar: Story = {
  args: { kind: "bar", data: sample, index: "date", categories: ["returnPct"] },
};

export const DarkMode: Story = {
  args: { kind: "area", data: sample, index: "date", categories: ["returnPct"] },
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6">
        <Story />
      </div>
    ),
  ],
};

export const Empty: Story = {
  args: { kind: "area", data: [], index: "date", categories: ["returnPct"] },
};
