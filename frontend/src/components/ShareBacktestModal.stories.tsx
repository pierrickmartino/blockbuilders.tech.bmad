import type { Meta, StoryObj } from "@storybook/react";
import { ShareBacktestModal } from "./ShareBacktestModal";

const meta = {
  title: "Components/ShareBacktestModal",
  component: ShareBacktestModal,
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true },
    docs: {
      description: {
        component:
          "Dialog for generating a read-only share link for a backtest result. Lets the user pick a link expiration (7 days, 30 days, or never), then shows the generated URL for copying. Strategy logic is never exposed in the shared view.",
      },
    },
  },
  args: {
    runId: "run-abc-123",
    open: true,
    onOpenChange: () => {},
  },
} satisfies Meta<typeof ShareBacktestModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Closed: Story = {
  args: { open: false },
};
