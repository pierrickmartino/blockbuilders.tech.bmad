import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="metrics">Metrics</TabsTrigger>
        <TabsTrigger value="trades">Trades</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm text-muted-foreground p-2">
          Strategy overview and equity curve.
        </p>
      </TabsContent>
      <TabsContent value="metrics">
        <p className="text-sm text-muted-foreground p-2">
          Performance metrics and statistics.
        </p>
      </TabsContent>
      <TabsContent value="trades">
        <p className="text-sm text-muted-foreground p-2">
          Individual trade list and details.
        </p>
      </TabsContent>
    </Tabs>
  ),
};
