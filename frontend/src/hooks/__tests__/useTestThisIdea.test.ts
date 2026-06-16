import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTestThisIdea } from "../useTestThisIdea";
import { StrategyTemplatesApiClient } from "@/lib/api/strategy-templates-client";
import { startAutoBacktest } from "@/lib/start-auto-backtest";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api/strategy-templates-client", () => ({
  StrategyTemplatesApiClient: {
    clone: vi.fn(),
  },
}));

vi.mock("@/lib/start-auto-backtest", () => ({
  startAutoBacktest: vi.fn(),
}));

const mockClone = vi.mocked(StrategyTemplatesApiClient.clone);
const mockStartAutoBacktest = vi.mocked(startAutoBacktest);

const mockStrategy = {
  id: "strat-cloned",
  name: "RSI Oversold Bounce Copy",
  asset: "BTC/USDT",
  timeframe: "1d",
  entry_path: "template_clone" as const,
  is_archived: false,
  auto_update_enabled: false,
  auto_update_lookback_days: 30,
  last_auto_run_at: null,
  digest_email_enabled: false,
  created_at: "2026-06-16T00:00:00Z",
  updated_at: "2026-06-16T00:00:00Z",
};

describe("useTestThisIdea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClone.mockResolvedValue(mockStrategy);
    mockStartAutoBacktest.mockResolvedValue({ runId: "run-123" });
  });

  it("starts with isLoading false and no error", () => {
    const { result } = renderHook(() =>
      useTestThisIdea({ templateId: "tmpl-1", userId: "user-1" })
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("clones the template when trigger() is called", async () => {
    const { result } = renderHook(() =>
      useTestThisIdea({ templateId: "tmpl-1", userId: "user-1" })
    );

    await act(async () => {
      await result.current.trigger();
    });

    expect(mockClone).toHaveBeenCalledWith("tmpl-1");
  });

  it("enqueues an auto-backtest for the cloned strategy", async () => {
    const { result } = renderHook(() =>
      useTestThisIdea({ templateId: "tmpl-1", userId: "user-1" })
    );

    await act(async () => {
      await result.current.trigger();
    });

    expect(mockStartAutoBacktest).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyId: "strat-cloned",
        entryPath: "template_clone",
        source: "lesson_test_this_idea",
        userId: "user-1",
      })
    );
  });

  it("navigates to the result page with the run preselected", async () => {
    const { result } = renderHook(() =>
      useTestThisIdea({ templateId: "tmpl-1", userId: "user-1" })
    );

    await act(async () => {
      await result.current.trigger();
    });

    expect(mockPush).toHaveBeenCalledWith(
      "/strategies/strat-cloned/backtest?run=run-123"
    );
  });

  it("sets isLoading true during the flow and false after", async () => {
    let resolveClone!: (v: typeof mockStrategy) => void;
    mockClone.mockReturnValueOnce(
      new Promise((res) => { resolveClone = res; })
    );

    const { result } = renderHook(() =>
      useTestThisIdea({ templateId: "tmpl-1", userId: "user-1" })
    );

    act(() => { void result.current.trigger(); });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveClone(mockStrategy);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("sets error and resets isLoading when clone fails", async () => {
    mockClone.mockRejectedValueOnce(new Error("clone failed"));

    const { result } = renderHook(() =>
      useTestThisIdea({ templateId: "tmpl-1", userId: "user-1" })
    );

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.error).toBe("clone failed");
    expect(result.current.isLoading).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does nothing when templateId is null", async () => {
    const { result } = renderHook(() =>
      useTestThisIdea({ templateId: null, userId: "user-1" })
    );

    await act(async () => {
      await result.current.trigger();
    });

    expect(mockClone).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
