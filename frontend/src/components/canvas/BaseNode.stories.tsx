import type { Meta, StoryObj } from "@storybook/react";
import { ReactFlowProvider } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import BaseNode from "./BaseNode";
import { ReadinessProvider } from "@/context/ReadinessContext";

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

const readyNodes: Node[] = [
  { id: "es1", type: "entry_signal", position: { x: 0, y: 0 }, data: {} },
  { id: "xs1", type: "exit_signal", position: { x: 0, y: 0 }, data: {} },
  { id: "r1", type: "stop_loss", position: { x: 0, y: 0 }, data: {} },
  { id: "logic1", type: "logic", position: { x: 0, y: 0 }, data: {} },
];
const readyEdges: Edge[] = [
  { id: "e1", source: "logic1", target: "es1" },
  { id: "e2", source: "logic1", target: "xs1" },
];

const warningNodes: Node[] = [
  { id: "es1", type: "entry_signal", position: { x: 0, y: 0 }, data: {} },
  { id: "xs1", type: "exit_signal", position: { x: 0, y: 0 }, data: {} },
  { id: "logic1", type: "logic", position: { x: 0, y: 0 }, data: {} },
];
const warningEdges: Edge[] = [
  { id: "e1", source: "logic1", target: "es1" },
  { id: "e2", source: "logic1", target: "xs1" },
];

export const ReadinessStatePulse: Story = {
  args: { label: "Signal", selected: false, category: "signal" },
  render: () => (
    <ReactFlowProvider>
      <div className="flex flex-wrap gap-8 p-8 bg-slate-50 dark:bg-slate-900 items-start">
        <div className="flex flex-col gap-2 items-center">
          <span className="text-xs text-slate-500">Ready (emerald)</span>
          <ReadinessProvider nodes={readyNodes} edges={readyEdges}>
            <BaseNode label="Entry Signal" selected={false} category="signal" blockType="entry_signal" />
          </ReadinessProvider>
        </div>
        <div className="flex flex-col gap-2 items-center">
          <span className="text-xs text-slate-500">Warning (amber)</span>
          <ReadinessProvider nodes={warningNodes} edges={warningEdges}>
            <BaseNode label="Entry Signal" selected={false} category="signal" blockType="entry_signal" />
          </ReadinessProvider>
        </div>
        <div className="flex flex-col gap-2 items-center">
          <span className="text-xs text-slate-500">Issue (rose)</span>
          <ReadinessProvider nodes={[]} edges={[]}>
            <BaseNode label="Entry Signal" selected={false} category="signal" blockType="entry_signal" />
          </ReadinessProvider>
        </div>
      </div>
    </ReactFlowProvider>
  ),
};

export const AllCategories: Story = {
  args: { label: "Price", selected: false, category: "input" },
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
