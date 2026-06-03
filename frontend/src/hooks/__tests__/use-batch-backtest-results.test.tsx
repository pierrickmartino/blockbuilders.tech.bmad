import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBatchBacktestResults } from "@/hooks/useBatchBacktestResults";
import { BacktestsApiClient } from "@/lib/api/backtests-client";

vi.mock("@/lib/api/backtests-client", () => ({
  BacktestsApiClient: {
    getBatchStatus: vi.fn(),
  },
  backtestsKeys: {
    all: () => ["backtests"],
    batch: (id: string) => ["backtests", "batch", id],
  },
}));

const mockGetBatchStatus = vi.mocked(BacktestsApiClient.getBatchStatus);

const makeRun = (
  id: string,
  status: "pending" | "running" | "completed" | "failed" | "skipped"
) => ({
  run_id: id,
  strategy_id: "strat-1",
  status,
  asset: "BTC/USDT",
  timeframe: "1h",
  date_from: "2024-01-01T00:00:00Z",
  date_to: "2024-03-01T00:00:00Z",
  triggered_by: "user",
});

const makeBatchStatus = (runs: ReturnType<typeof makeRun>[]) => ({
  batch_id: "batch-1",
  runs,
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

describe("useBatchBacktestResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty runs and false isAllDone when batchId is null", () => {
    const { result } = renderHook(() => useBatchBacktestResults(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.runs).toEqual([]);
    expect(result.current.isAllDone).toBe(false);
  });

  it("fetches batch status when batchId is provided", async () => {
    mockGetBatchStatus.mockResolvedValue(makeBatchStatus([makeRun("r1", "completed")]));

    vi.useFakeTimers();
    const { result } = renderHook(() => useBatchBacktestResults("batch-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(mockGetBatchStatus).toHaveBeenCalledWith("batch-1");
    expect(result.current.runs).toHaveLength(1);
    vi.useRealTimers();
  });

  it("isAllDone is true when every run has a terminal status", async () => {
    mockGetBatchStatus.mockResolvedValue(
      makeBatchStatus([makeRun("r1", "completed"), makeRun("r2", "failed")])
    );

    vi.useFakeTimers();
    const { result } = renderHook(() => useBatchBacktestResults("batch-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(result.current.isAllDone).toBe(true);
    vi.useRealTimers();
  });

  it("isAllDone is false when any run is still active", async () => {
    mockGetBatchStatus.mockResolvedValue(
      makeBatchStatus([makeRun("r1", "completed"), makeRun("r2", "running")])
    );

    vi.useFakeTimers();
    const { result } = renderHook(() => useBatchBacktestResults("batch-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(result.current.isAllDone).toBe(false);
    vi.useRealTimers();
  });

  it("exposes isLoading true while fetch is in flight", async () => {
    let resolve!: (v: ReturnType<typeof makeBatchStatus>) => void;
    mockGetBatchStatus.mockImplementation(
      () => new Promise<ReturnType<typeof makeBatchStatus>>((res) => { resolve = res; })
    );

    vi.useFakeTimers();
    const { result } = renderHook(() => useBatchBacktestResults("batch-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(result.current.isLoading).toBe(true);

    act(() => { resolve(makeBatchStatus([makeRun("r1", "completed")])); });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(result.current.isLoading).toBe(false);

    vi.useRealTimers();
  });

  it("exposes error string when fetch fails", async () => {
    mockGetBatchStatus.mockRejectedValue(new Error("Batch not found"));

    vi.useFakeTimers();
    const { result } = renderHook(() => useBatchBacktestResults("batch-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(result.current.error).toBeTruthy();
    vi.useRealTimers();
  });

  it("stops polling when all runs reach terminal status", async () => {
    const sequence = [
      makeBatchStatus([makeRun("r1", "pending"), makeRun("r2", "running")]),
      makeBatchStatus([makeRun("r1", "completed"), makeRun("r2", "completed")]),
    ];
    let callCount = 0;

    mockGetBatchStatus.mockImplementation(async () => {
      return sequence[Math.min(callCount++, sequence.length - 1)];
    });

    vi.useFakeTimers();
    const { result } = renderHook(() => useBatchBacktestResults("batch-1"), {
      wrapper: createWrapper(),
    });

    // Initial fetch: still active
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(result.current.isAllDone).toBe(false);

    // Poll fires → all completed
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(result.current.isAllDone).toBe(true);

    const callsAtTerminal = mockGetBatchStatus.mock.calls.length;

    // No more polls
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(mockGetBatchStatus.mock.calls.length).toBe(callsAtTerminal);

    vi.useRealTimers();
  });

  it("skipped runs count as terminal for isAllDone", async () => {
    mockGetBatchStatus.mockResolvedValue(
      makeBatchStatus([makeRun("r1", "skipped"), makeRun("r2", "completed")])
    );

    vi.useFakeTimers();
    const { result } = renderHook(() => useBatchBacktestResults("batch-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(result.current.isAllDone).toBe(true);
    vi.useRealTimers();
  });
});
