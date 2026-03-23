import type { Meta, StoryObj } from "@storybook/react";
import { ReactFlowProvider } from "@xyflow/react";
import BaseNode from "./BaseNode";

const meta = {
  title: "Canvas/BaseNode",
  component: BaseNode,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <div className="p-8 bg-slate-50 dark:bg-slate-900">
          <Story />
        </div>
      </ReactFlowProvider>
    ),
  ],
  parameters: {
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof BaseNode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InputCategory: Story = {
  args: {
    label: "Price",
    selected: false,
    category: "input",
    blockType: "price",
  },
};

export const IndicatorCategory: Story = {
  args: {
    label: "RSI (14)",
    selected: false,
    category: "indicator",
    blockType: "rsi",
  },
};

export const LogicCategory: Story = {
  args: {
    label: "Compare",
    selected: false,
    category: "logic",
    blockType: "compare",
  },
};

export const SignalCategory: Story = {
  args: {
    label: "Entry Signal",
    selected: false,
    category: "signal",
    blockType: "entry_signal",
  },
};

export const RiskCategory: Story = {
  args: {
    label: "Stop Loss",
    selected: false,
    category: "risk",
    blockType: "stop_loss",
  },
};

export const Selected: Story = {
  args: {
    label: "RSI (14)",
    selected: true,
    category: "indicator",
    blockType: "rsi",
  },
};

export const WithError: Story = {
  args: {
    label: "Entry Signal",
    selected: false,
    category: "signal",
    blockType: "entry_signal",
    hasError: true,
    validationMessage: "No signal connected. Connect a logic block to this node.",
    helpLink: "/strategy-guide#entry-signal",
  },
};

export const CompactMode: Story = {
  args: {
    label: "RSI (14)",
    selected: false,
    category: "indicator",
    blockType: "rsi",
    isCompact: true,
    summary: "RSI·14",
  },
};

export const MobileMode: Story = {
  args: {
    label: "Stop Loss",
    selected: false,
    category: "risk",
    blockType: "stop_loss",
    isMobileMode: true,
  },
};

export const AllCategories: Story = {
  render: () => (
    <ReactFlowProvider>
      <div className="flex flex-wrap gap-4 p-8 bg-slate-50 dark:bg-slate-900">
        {(
          [
            { label: "Price", category: "input", blockType: "price" },
            { label: "RSI (14)", category: "indicator", blockType: "rsi" },
            { label: "Compare", category: "logic", blockType: "compare" },
            { label: "Entry Signal", category: "signal", blockType: "entry_signal" },
            { label: "Stop Loss", category: "risk", blockType: "stop_loss" },
          ] as const
        ).map((p) => (
          <BaseNode key={p.category} {...p} selected={false} />
        ))}
      </div>
    </ReactFlowProvider>
  ),
};
