import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PerformanceAlertPanel } from "@/components/backtest/PerformanceAlertPanel";
import { AlertsApiClient, alertsKeys } from "@/lib/api/alerts-client";
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
const mockCreate = vi.mocked(AlertsApiClient.create);

const makeAlertRule = (overrides: Partial<AlertRule> = {}): AlertRule => ({
  id: "alert-1",
  user_id: "user-1",
  alert_type: "performance",
  strategy_id: "strategy-1",
  threshold_pct: null,
  alert_on_entry: true,
  alert_on_exit: false,
  notify_webhook: false,
  notify_in_app: true,
  notify_email: false,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
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

describe("PerformanceAlertPanel — webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

  it("renders the webhook toggle in the create form", async () => {
    render(
      <PerformanceAlertPanel backtestRunId="run-1" strategyId="strategy-1" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByLabelText(/send to webhook/i)).toBeInTheDocument();
  });

  it("shows URL input when webhook toggle is checked", async () => {
    render(
      <PerformanceAlertPanel backtestRunId="run-1" strategyId="strategy-1" />,
      { wrapper: createWrapper() }
    );

    const toggle = screen.getByLabelText(/send to webhook/i);
    fireEvent.click(toggle);

    expect(screen.getByPlaceholderText(/https:\/\//i)).toBeInTheDocument();
  });

  it("includes notify_webhook and webhook_url in create request", async () => {
    const created = makeAlertRule({ notify_webhook: true, webhook_url: "https://example.com/hook" });
    mockCreate.mockResolvedValue(created);

    render(
      <PerformanceAlertPanel backtestRunId="run-1" strategyId="strategy-1" />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByLabelText(/strategy enters/i));
    fireEvent.click(screen.getByLabelText(/send to webhook/i));

    const urlInput = screen.getByPlaceholderText(/https:\/\//i);
    fireEvent.change(urlInput, { target: { value: "https://example.com/hook" } });

    fireEvent.click(screen.getByRole("button", { name: /save alert/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        notify_webhook: true,
        webhook_url: "https://example.com/hook",
      })
    );
  });

  it("shows webhook status in read-only summary when enabled", async () => {
    mockList.mockResolvedValue([
      makeAlertRule({ notify_webhook: true, webhook_url: "https://example.com/hook" }),
    ]);

    render(
      <PerformanceAlertPanel backtestRunId="run-1" strategyId="strategy-1" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(screen.getByText(/edit alert/i)).toBeInTheDocument());
    expect(screen.getByText(/webhook/i)).toBeInTheDocument();
  });
});
