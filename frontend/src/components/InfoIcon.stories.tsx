import type { Meta, StoryObj } from "@storybook/react";
import InfoIcon from "./InfoIcon";

const meta = {
  title: "Components/InfoIcon",
  component: InfoIcon,
  tags: ["autodocs"],
} satisfies Meta<typeof InfoIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tooltip: { short: "Short tooltip", category: "metric" },
  },
};

export const WithLongTooltip: Story = {
  args: {
    tooltip: {
      short: "RSI",
      long: "Relative Strength Index measures momentum on a scale of 0-100.",
      category: "block",
    },
  },
};

export const CustomClass: Story = {
  args: {
    tooltip: { short: "Custom styled", category: "param" },
    className: "text-primary",
  },
};
