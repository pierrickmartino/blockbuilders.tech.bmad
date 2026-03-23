import type { Meta, StoryObj } from "@storybook/react";
import { HealthBar } from "./HealthBar";
import type { Node, Edge } from "@xyflow/react";

const meta = {
  title: "Canvas/HealthBar",
  component: HealthBar,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-6 bg-slate-50 dark:bg-slate-900 max-w-lg">
        <Story />
      </div>
    ),
  ],
  parameters: {
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof HealthBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Empty canvas — all incomplete
export const AllIncomplete: Story = {
  args: {
    nodes: [],
    edges: [],
  },
};

// Entry signal present, but no exit or risk
const entryNodes: Node[] = [
  { id: "n1", type: "entry_signal", position: { x: 0, y: 0 }, data: { label: "Entry Signal" } },
];
export const EntryOnly: Story = {
  args: {
    nodes: entryNodes,
    edges: [],
  },
};

// Entry + Exit signal, no risk
const entryExitNodes: Node[] = [
  { id: "n1", type: "entry_signal", position: { x: 0, y: 0 }, data: { label: "Entry Signal" } },
  { id: "n2", type: "exit_signal", position: { x: 200, y: 0 }, data: { label: "Exit Signal" } },
];
export const EntryAndExit: Story = {
  args: {
    nodes: entryExitNodes,
    edges: [],
  },
};

// Full strategy: entry + exit + stop_loss
const fullNodes: Node[] = [
  { id: "n1", type: "entry_signal", position: { x: 0, y: 0 }, data: { label: "Entry Signal" } },
  { id: "n2", type: "exit_signal", position: { x: 200, y: 0 }, data: { label: "Exit Signal" } },
  { id: "n3", type: "stop_loss", position: { x: 400, y: 0 }, data: { label: "Stop Loss", params: { percent: 2 } } },
];
const fullEdges: Edge[] = [
  { id: "e1", source: "n1", target: "n2" },
];
export const AllComplete: Story = {
  args: {
    nodes: fullNodes,
    edges: fullEdges,
  },
};
