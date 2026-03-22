import type { Meta, StoryObj } from "@storybook/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a pair" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="btc-usdt">BTC / USDT</SelectItem>
        <SelectItem value="eth-usdt">ETH / USDT</SelectItem>
        <SelectItem value="sol-usdt">SOL / USDT</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Disabled" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="btc-usdt">BTC / USDT</SelectItem>
      </SelectContent>
    </Select>
  ),
};
