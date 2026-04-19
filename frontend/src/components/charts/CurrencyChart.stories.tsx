import type { Meta, StoryObj } from "@storybook/react";
import { CurrencyChart } from "./CurrencyChart";

const sample = [
  { date: "Jan", equity: 10000, benchmark: 10000 },
  { date: "Feb", equity: 10500, benchmark: 10200 },
  { date: "Mar", equity: 11200, benchmark: 10350 },
  { date: "Apr", equity: 10900, benchmark: 10500 },
  { date: "May", equity: 11800, benchmark: 10700 },
];

const meta: Meta<typeof CurrencyChart> = {
  title: "Charts/CurrencyChart",
  component: CurrencyChart,
};
export default meta;
type Story = StoryObj<typeof CurrencyChart>;

export const AreaDefault: Story = {
  args: {
    kind: "area",
    data: sample,
    index: "date",
    categories: ["equity", "benchmark"],
  },
};

export const Line: Story = {
  args: {
    kind: "line",
    data: sample,
    index: "date",
    categories: ["equity"],
  },
};

export const DarkMode: Story = {
  args: {
    kind: "area",
    data: sample,
    index: "date",
    categories: ["equity", "benchmark"],
  },
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6">
        <Story />
      </div>
    ),
  ],
};

export const Empty: Story = {
  args: { kind: "area", data: [], index: "date", categories: ["equity"] },
};
