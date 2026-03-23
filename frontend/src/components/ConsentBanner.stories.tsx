import type { Meta, StoryObj } from "@storybook/react";
import { ConsentBanner } from "./ConsentBanner";

const meta = {
  title: "Components/ConsentBanner",
  component: ConsentBanner,
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true },
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Fixed bottom banner asking the user to accept or decline product analytics. Renders only when consent has not yet been given (stored in localStorage). Use the story decorator below to force it visible.",
      },
    },
  },
  decorators: [
    (Story) => {
      // Clear consent so the banner is always visible in Storybook
      if (typeof window !== "undefined") {
        localStorage.removeItem("bb_analytics_consent");
      }
      return (
        <div className="relative h-40 bg-background">
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof ConsentBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
