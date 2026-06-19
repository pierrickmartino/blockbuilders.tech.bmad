import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStrategyAlerts } from "@/hooks/use-strategy-alerts";
import { AlertsApiClient } from "@/lib/api/alerts-client";
import { BacktestsApiClient } from "@/lib/api/backtests-client";
import type { AlertRule } from "@/types/alert";
import type { BacktestListItem, BacktestListPage } from "@/types/backtest";

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

vi.mock("@/lib/api/backtests-client", () => ({
  BacktestsApiClient: {
    list: vi.fn(),
  },
  backtestsKeys: {
    list: (filters: Record<string, unknown>) => ["backtests", "list", filters],
  },
}));

const mockList = vi.mocked(AlertsApiClient.list);
const mockUpdate = vi.mocked(AlertsApiClient.update);
const mockCreate = vi.mocked(AlertsApiClient.create);
const mockBacktestsList = vi.mocked(BacktestsApiClient.list);

const makeBacktestItem = (overrides: Partial<BacktestListItem> = {}): BacktestListItem => ({
  run_id: "run-1",
  strategy_id: "strategy-1",
  status: "completed",
  asset: "BTC",
  timeframe: "1d",
  date_from: "2026-01-01",
  date_to: "2026-05-01",
  triggered_by: "manual",
  created_at: "2026-05-29T08:00:00Z",
  ...overrides,
});

const makeBacktestPage = (items: BacktestListItem[]): BacktestListPage => ({
  items,
  total: items.length,
});

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
    mockBacktestsList.mockResolvedValue(makeBacktestPage([]));
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

  it("creates an alert anchored to the latest completed backtest run when none exists", async () => {
    mockList.mockResolvedValue([]);
    mockBacktestsList.mockResolvedValue(
      makeBacktestPage([
        makeBacktestItem({ run_id: "newest-run", status: "running" }),
        makeBacktestItem({ run_id: "latest-completed", status: "completed" }),
      ])
    );
    mockCreate.mockResolvedValue(makeAlertRule({ id: "created-alert" }));

    const { result } = renderHook(
      () => useStrategyAlerts({ strategyId: "strategy-1" }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.canCreateAlert).toBe(true));

    act(() => {
      result.current.startEditing();
      result.current.setAlertEnabled(true);
      result.current.setAlertThreshold(5);
    });
    act(() => {
      result.current.save();
    });

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        alert_type: "performance",
        backtest_run_id: "latest-completed",
      })
    );
  });

  it("cannot create an alert and surfaces an error when no completed run exists", async () => {
    mockList.mockResolvedValue([]);
    mockBacktestsList.mockResolvedValue(
      makeBacktestPage([makeBacktestItem({ run_id: "pending-run", status: "running" })])
    );

    const { result } = renderHook(
      () => useStrategyAlerts({ strategyId: "strategy-1" }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockBacktestsList).toHaveBeenCalled());
    expect(result.current.canCreateAlert).toBe(false);

    act(() => {
      result.current.startEditing();
      result.current.setAlertEnabled(true);
      result.current.setAlertThreshold(5);
    });
    act(() => {
      result.current.save();
    });

    await waitFor(() =>
      expect(result.current.alertError).toBe(
        "Run a backtest for this strategy to create a performance alert."
      )
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
