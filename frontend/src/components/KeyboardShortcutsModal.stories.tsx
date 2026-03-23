import type { Meta, StoryObj } from "@storybook/react";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";

const meta = {
  title: "Components/KeyboardShortcutsModal",
  component: KeyboardShortcutsModal,
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true },
    docs: {
      description: {
        component:
          "Modal listing all keyboard shortcuts available in the strategy canvas editor. Opened by pressing '?' or clicking the shortcuts button in the canvas toolbar. Adapts key labels for Mac vs Windows/Linux.",
      },
    },
  },
  args: {
    open: true,
    onOpenChange: () => {},
  },
} satisfies Meta<typeof KeyboardShortcutsModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Closed: Story = {
  args: { open: false },
};
