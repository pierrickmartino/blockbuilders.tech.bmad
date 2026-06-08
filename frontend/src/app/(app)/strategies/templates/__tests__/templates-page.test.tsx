import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TemplatesPage from "../page";
import { StrategyTemplatesApiClient } from "@/lib/api/strategy-templates-client";
import { trackEvent } from "@/lib/analytics";
import type { StrategyTemplate } from "@/types/strategy-template";
import type { Strategy } from "@/types/strategy";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api/strategy-templates-client", () => ({
  StrategyTemplatesApiClient: {
    list: vi.fn(),
    clone: vi.fn(),
  },
  strategyTemplatesKeys: {
    all: () => ["strategy-templates"],
    lists: () => ["strategy-templates", "list"],
    list: () => ["strategy-templates", "list", {}],
    detail: (id: string) => ["strategy-templates", "detail", id],
  },
}));

vi.mock("@/context/auth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockList = vi.mocked(StrategyTemplatesApiClient.list);
const mockClone = vi.mocked(StrategyTemplatesApiClient.clone);
const mockTrackEvent = vi.mocked(trackEvent);

const TEMPLATE: StrategyTemplate = {
  id: "template-1",
  name: "MA Crossover",
  description: "A simple moving average crossover strategy.",
  logic_summary: "Buy when the fast MA crosses above the slow MA.",
  use_cases: [],
  parameter_ranges: {},
  asset: "BTC/USDT",
  timeframe: "1d",
  difficulty: "beginner",
  sort_order: 0,
  teaches_description: null,
  created_at: "2026-01-01T00:00:00Z",
};

const CLONED_STRATEGY: Strategy = {
  id: "strategy-999",
  name: "MA Crossover",
  asset: "BTC/USDT",
  timeframe: "1d",
  entry_path: "template_clone",
  is_archived: false,
  auto_update_enabled: false,
  auto_update_lookback_days: 90,
  last_auto_run_at: null,
  digest_email_enabled: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  tags: [],
};

function renderTemplatesPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TemplatesPage />
    </QueryClientProvider>
  );
}

describe("TemplatesPage — clone emits the strategy_created authored milestone (#558)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([TEMPLATE]);
    mockClone.mockResolvedValue(CLONED_STRATEGY);
  });

  it("fires strategy_created carrying the persisted template_clone entry path when a template is cloned", async () => {
    renderTemplatesPage();

    const cloneButton = await screen.findByRole("button", { name: "Clone" });
    fireEvent.click(cloneButton);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "strategy_created",
        expect.objectContaining({ entry_path: "template_clone" }),
        "user-1"
      );
    });
  });

  it("fires strategy_created exactly once per clone, with no duplicate authored milestones", async () => {
    renderTemplatesPage();

    const cloneButton = await screen.findByRole("button", { name: "Clone" });
    fireEvent.click(cloneButton);

    await waitFor(() => {
      expect(mockClone).toHaveBeenCalledTimes(1);
    });

    const strategyCreatedCalls = mockTrackEvent.mock.calls.filter(
      ([eventName]) => eventName === "strategy_created"
    );
    expect(strategyCreatedCalls).toHaveLength(1);
  });
});
