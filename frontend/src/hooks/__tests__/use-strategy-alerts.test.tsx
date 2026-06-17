import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStrategyAlerts } from "@/hooks/use-strategy-alerts";
import { AlertsApiClient } from "@/lib/api/alerts-client";
import type { AlertRule } from "@/types/alert";

vi.mock("@/lib/api/alerts-client", () => ({
  AlertsApiClient: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  alertsKeys: {
    all: () => ["alerts"],
    lists: () => ["alerts", "list"],
    list: () => ["alerts", "list", {}],
    detail: (id: string) => ["alerts", "detail", id],
  },
}));

const mockList = vi.mocked(AlertsApiClient.list);
const mockUpdate = vi.mocked(AlertsApiClient.update);

const makeAlertRule = (overrides: Partial<AlertRule> = {}): AlertRule => ({
  id: "alert-1",
  user_id: "user-1",
  alert_type: "performance",
  strategy_id: "strategy-1",
  threshold_pct: 7.5,
  alert_on_entry: true,
  alert_on_exit: false,
  notify_webhook: false,
  notify_in_app: true,
  notify_email: true,
  is_active: true,
  created_at: "2026-05-29T08:00:00Z",
  updated_at: "2026-05-29T08:00:00Z",
  ...overrides,
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useStrategyAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seeds the edit form from the loaded alert rule before saving an existing alert", async () => {
    const existingRule = makeAlertRule();
    mockList.mockResolvedValue([
      makeAlertRule({ id: "other-alert", strategy_id: "other-strategy" }),
      existingRule,
    ]);
    mockUpdate.mockResolvedValue(existingRule);

    const { result } = renderHook(
      () => useStrategyAlerts({ strategyId: "strategy-1" }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.alertRule?.id).toBe("alert-1"));
    await waitFor(() => expect(result.current.alertEnabled).toBe(true));

    expect(result.current.alertThreshold).toBe(7.5);
    expect(result.current.alertOnEntry).toBe(true);
    expect(result.current.alertOnExit).toBe(false);
    expect(result.current.notifyEmail).toBe(true);

    act(() => {
      result.current.startEditing();
      result.current.save();
    });

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith("alert-1", {
      threshold_pct: 7.5,
      alert_on_entry: true,
      alert_on_exit: false,
      notify_email: true,
      notify_webhook: false,
      webhook_url: undefined,
      is_active: true,
    });
  });
});
