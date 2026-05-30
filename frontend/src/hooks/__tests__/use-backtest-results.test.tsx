import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBacktestResults } from "@/hooks/useBacktestResults";
import { BacktestsApiClient } from "@/lib/api/backtests-client";

vi.mock("@/lib/api/backtests-client", () => ({
  BacktestsApiClient: {
    get: vi.fn(),
    getTrades: vi.fn(),
    getEquityCurve: vi.fn(),
    getBenchmarkEquityCurve: vi.fn(),
  },
  backtestsKeys: {
    all: () => ["backtests"],
    detail: (id: string) => ["backtests", "detail", id],
    trades: (id: string) => ["backtests", id, "trades"],
    equityCurve: (id: string) => ["backtests", id, "equity-curve"],
    benchmarkCurve: (id: string) => ["backtests", id, "benchmark-curve"],
  },
}));

const mockGet = vi.mocked(BacktestsApiClient.get);
const mockGetTrades = vi.mocked(BacktestsApiClient.getTrades);
const mockGetEquityCurve = vi.mocked(BacktestsApiClient.getEquityCurve);
const mockGetBenchmarkEquityCurve = vi.mocked(BacktestsApiClient.getBenchmarkEquityCurve);

const makeRun = (status: "pending" | "running" | "completed" | "failed") => ({
  run_id: "run-1",
  strategy_id: "strat-1",
  status,
  asset: "BTC/USDT",
  timeframe: "1h",
  date_from: "2024-01-01T00:00:00Z",
  date_to: "2024-03-01T00:00:00Z",
  triggered_by: "user",
});

const stubTrades = [
  {
    entry_time: "2024-01-02T00:00:00Z",
    entry_price: 40000,
    exit_time: "2024-01-03T00:00:00Z",
    exit_price: 41000,
    side: "long",
    pnl: 1000,
    pnl_pct: 2.5,
    qty: 0.1,
    sl_price_at_entry: null,
    tp_price_at_entry: null,
    exit_reason: "tp",
    mae_usd: 0,
    mae_pct: 0,
    mfe_usd: 1000,
    mfe_pct: 2.5,
    initial_risk_usd: null,
    r_multiple: null,
    peak_price: 41000,
    peak_ts: "2024-01-03T00:00:00Z",
    trough_price: 40000,
    trough_ts: "2024-01-02T00:00:00Z",
    duration_seconds: 86400,
  },
];

const stubCurve = [{ timestamp: "2024-01-01T00:00:00Z", equity: 10000 }];

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

describe("useBacktestResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTrades.mockResolvedValue(stubTrades);
    mockGetEquityCurve.mockResolvedValue(stubCurve);
    mockGetBenchmarkEquityCurve.mockResolvedValue(stubCurve);
  });

  it("returns null selectedRun before any run is selected", () => {
    const { result } = renderHook(() => useBacktestResults(null), { wrapper: createWrapper() });
    expect(result.current.selectedRun).toBeNull();
  });

  it("fetches run detail when a runId is provided", async () => {
    mockGet.mockResolvedValue(makeRun("completed"));

    const { result } = renderHook(() => useBacktestResults("run-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.selectedRun).not.toBeNull());
    expect(mockGet).toHaveBeenCalledWith("run-1");
    expect(result.current.selectedRun?.run_id).toBe("run-1");
  });

  it("fetches trades and equity-curve only when status is completed", async () => {
    mockGet.mockResolvedValue(makeRun("completed"));

    const { result } = renderHook(() => useBacktestResults("run-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.trades).toHaveLength(1));
    expect(mockGetTrades).toHaveBeenCalledWith("run-1");
    expect(mockGetEquityCurve).toHaveBeenCalledWith("run-1");
  });

  it("does not fetch trades when status is pending", async () => {
    mockGet.mockResolvedValue(makeRun("pending"));

    const { result } = renderHook(() => useBacktestResults("run-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.selectedRun?.status).toBe("pending"));
    expect(mockGetTrades).not.toHaveBeenCalled();
  });

  it("silently returns empty benchmarkCurve when benchmark fetch fails", async () => {
    mockGet.mockResolvedValue(makeRun("completed"));
    mockGetBenchmarkEquityCurve.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() => useBacktestResults("run-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.trades).toHaveLength(1));
    expect(result.current.benchmarkCurve).toEqual([]);
  });

  it("exposes isLoadingTrades while trades fetch is in flight", async () => {
    mockGet.mockResolvedValue(makeRun("completed"));
    let resolveTrades!: (v: typeof stubTrades) => void;
    mockGetTrades.mockImplementation(
      () => new Promise<typeof stubTrades>((res) => { resolveTrades = res; })
    );

    const { result } = renderHook(() => useBacktestResults("run-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.selectedRun?.status).toBe("completed"));
    expect(result.current.isLoadingTrades).toBe(true);

    act(() => resolveTrades(stubTrades));
    await waitFor(() => expect(result.current.isLoadingTrades).toBe(false));
  });

  it("exposes tradesError when trades fetch fails", async () => {
    mockGet.mockResolvedValue(makeRun("completed"));
    mockGetTrades.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useBacktestResults("run-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.tradesError).not.toBeNull());
  });

  it("exposes a refetch handle", async () => {
    mockGet.mockResolvedValue(makeRun("completed"));

    const { result } = renderHook(() => useBacktestResults("run-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.selectedRun).not.toBeNull());
    expect(typeof result.current.refetch).toBe("function");
  });

  // KEY ACCEPTANCE CRITERION: terminal-poll-stop
  it("stops polling after status reaches completed", async () => {
    const sequence = [makeRun("pending"), makeRun("running"), makeRun("completed")];
    let callCount = 0;

    mockGet.mockImplementation(async () => {
      const run = sequence[Math.min(callCount, sequence.length - 1)];
      callCount++;
      return run;
    });

    vi.useFakeTimers();

    const { result } = renderHook(() => useBacktestResults("run-1"), { wrapper: createWrapper() });

    // Initial query fires at mount (no timer needed); advance 100ms to let promises settle
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(result.current.selectedRun?.status).toBe("pending");
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Advance past refetchInterval → running
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(result.current.selectedRun?.status).toBe("running");
    expect(mockGet).toHaveBeenCalledTimes(2);

    // Advance past refetchInterval → completed (terminal)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(result.current.selectedRun?.status).toBe("completed");

    const callsAtTerminal = mockGet.mock.calls.length;

    // Advance 30 s more — polling must have stopped
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(mockGet.mock.calls.length).toBe(callsAtTerminal);

    vi.useRealTimers();
  });

  it("stops polling when status is failed", async () => {
    mockGet.mockResolvedValue(makeRun("failed"));

    vi.useFakeTimers();

    const { result } = renderHook(() => useBacktestResults("run-1"), { wrapper: createWrapper() });

    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.selectedRun?.status).toBe("failed");
    const callsAtTerminal = mockGet.mock.calls.length;

    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(mockGet.mock.calls.length).toBe(callsAtTerminal);

    vi.useRealTimers();
  });
});
