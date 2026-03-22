import type { Meta, StoryObj } from "@storybook/react";
import { WhatYouLearnedCard } from "./WhatYouLearnedCard";

const meta = {
  title: "Components/WhatYouLearnedCard",
  component: WhatYouLearnedCard,
  tags: ["autodocs"],
} satisfies Meta<typeof WhatYouLearnedCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BeatBuyAndHold: Story = {
  args: {
    strategyReturnPct: 15.2,
    benchmarkReturnPct: 8.7,
    asset: "BTC/USDT",
    dateRange: "Jan 2024 – Jun 2024",
  },
};

export const Lagged: Story = {
  args: {
    strategyReturnPct: 4.1,
    benchmarkReturnPct: 12.3,
    asset: "ETH/USDT",
    dateRange: "Mar 2024 – Sep 2024",
  },
};

export const Neutral: Story = {
  args: {
    strategyReturnPct: 10.0,
    benchmarkReturnPct: 10.02,
    asset: "BTC/USDT",
    dateRange: "Jan 2024 – Dec 2024",
  },
};

export const WithDismiss: Story = {
  args: {
    strategyReturnPct: 15.2,
    benchmarkReturnPct: 8.7,
    asset: "BTC/USDT",
    dateRange: "Jan 2024 – Jun 2024",
    onDismiss: () => {},
  },
};
