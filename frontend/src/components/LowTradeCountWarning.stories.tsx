import type { Meta, StoryObj } from "@storybook/react";
import { LowTradeCountWarning } from "./LowTradeCountWarning";

const meta = {
  title: "Components/LowTradeCountWarning",
  component: LowTradeCountWarning,
  tags: ["autodocs"],
} satisfies Meta<typeof LowTradeCountWarning>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneTrade: Story = {
  args: { numTrades: 1 },
};

export const FiveTrades: Story = {
  args: { numTrades: 5 },
};

export const NineTrades: Story = {
  args: { numTrades: 9 },
};

export const Hidden: Story = {
  name: "Hidden (>= 10 trades)",
  args: { numTrades: 10 },
};

export const HiddenNull: Story = {
  name: "Hidden (null)",
  args: { numTrades: null },
};

export const HiddenZero: Story = {
  name: "Hidden (0 trades)",
  args: { numTrades: 0 },
};

export const Dark: Story = {
  name: "Dark mode",
  args: { numTrades: 3 },
  decorators: [
    (Story) => (
      <div className="dark bg-background p-4">
        <Story />
      </div>
    ),
  ],
};
