import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StrategyWizard } from "../strategy-wizard";
import { StrategiesApiClient } from "@/lib/api/strategies-client";
import { BacktestsApiClient } from "@/lib/api/backtests-client";
import { UsersApiClient } from "@/lib/api/users-client";
import { trackEvent } from "@/lib/analytics";
import { startAutoBacktest } from "@/lib/start-auto-backtest";
import type { Strategy } from "@/types/strategy";
import type { BacktestCreateResponse, BacktestStatusResponse } from "@/types/backtest";

vi.mock("@/lib/api/strategies-client", () => ({
  StrategiesApiClient: {
    create: vi.fn(),
    putDraft: vi.fn(),
  },
}));

vi.mock("@/lib/api/backtests-client", () => ({
  BacktestsApiClient: {
    create: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@/lib/api/users-client", () => ({
  UsersApiClient: {
    completeOnboarding: vi.fn(),
  },
}));

vi.mock("@/context/auth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    refreshUser: vi.fn(),
  }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/start-auto-backtest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/start-auto-backtest")>();
  return {
    ...actual,
    startAutoBacktest: vi.fn(actual.startAutoBacktest),
  };
});

const mockStrategiesClient = vi.mocked(StrategiesApiClient);
const mockBacktestsClient = vi.mocked(BacktestsApiClient);
const mockUsersClient = vi.mocked(UsersApiClient);
const mockTrackEvent = vi.mocked(trackEvent);
const mockStartAutoBacktest = vi.mocked(startAutoBacktest);

const STRATEGY: Strategy = {
  id: "strategy-123",
  name: "My BTC Strategy",
  asset: "BTC/USDT",
  timeframe: "1d",
  entry_path: "wizard",
  is_archived: false,
  auto_update_enabled: false,
  auto_update_lookback_days: 90,
  last_auto_run_at: null,
  digest_email_enabled: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  tags: [],
};

const CREATED_RUN: BacktestCreateResponse = { run_id: "run-456", status: "pending" };

const COMPLETED_RUN: BacktestStatusResponse = {
  run_id: "run-456",
  strategy_id: "strategy-123",
  strategy_version_id: "ver-1",
  strategy_version_number: 1,
  status: "completed",
  asset: "BTC/USDT",
  timeframe: "1d",
  date_from: "2025-01-01T00:00:00Z",
  date_to: "2026-01-01T00:00:00Z",
  triggered_by: "wizard",
};

/** Drives the wizard through all 6 steps using only default answers (each is
 *  valid out of the box once a name is entered) and submits on the last step. */
async function completeFirstRunWizard() {
  const nameInput = screen.getByPlaceholderText("e.g., BTC MA Crossover Daily");
  fireEvent.change(nameInput, { target: { value: "My BTC Strategy" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  // Steps 2 (asset), 3 (signal), 4 (MA config), 5 (exit) — defaults are valid
  for (let i = 0; i < 4; i++) {
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
  }

  // Step 6 (risk) — first-run completion button
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "See how it would have performed" })
    );
  });
}

describe("StrategyWizard — first-run activation handoff (#548)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStrategiesClient.create.mockResolvedValue(STRATEGY);
    mockStrategiesClient.putDraft.mockResolvedValue(undefined);
    mockBacktestsClient.create.mockResolvedValue(CREATED_RUN);
    mockBacktestsClient.get.mockResolvedValue(COMPLETED_RUN);
    mockUsersClient.completeOnboarding.mockResolvedValue(undefined);
  });

  it("hands off the just-completed run id to onComplete so the wizard can preselect the rendered verdict", async () => {
    const onComplete = vi.fn();

    render(
      <StrategyWizard
        isFirstRun
        onClose={vi.fn()}
        onComplete={onComplete}
        onSkipToCanvas={vi.fn()}
      />
    );

    vi.useFakeTimers();
    try {
      await completeFirstRunWizard();
      // First poll tick: BacktestsApiClient.get resolves to "completed"
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
    } finally {
      vi.useRealTimers();
    }

    // The wizard must hand both the strategy id AND the completed run id to
    // onComplete — without the run id, the parent can't navigate to
    // `?run={runId}` and the verdict would never render (issue #548).
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(STRATEGY.id, CREATED_RUN.run_id);
  });

  it("keeps auto_backtest_completed as job telemetry only — never the activation signal", async () => {
    const onComplete = vi.fn();

    render(
      <StrategyWizard
        isFirstRun
        onClose={vi.fn()}
        onComplete={onComplete}
        onSkipToCanvas={vi.fn()}
      />
    );

    vi.useFakeTimers();
    try {
      await completeFirstRunWizard();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
    } finally {
      vi.useRealTimers();
    }

    // auto_backtest_completed may still fire as job telemetry, but it must
    // never carry the canonical results_viewed event name — that fires later,
    // from the shared tracker, once the verdict actually renders.
    const trackedEventNames = mockTrackEvent.mock.calls.map(([eventName]) => eventName);
    expect(trackedEventNames).toContain("auto_backtest_completed");
    expect(trackedEventNames).not.toContain("results_viewed");
  });
});

describe("StrategyWizard — funnel events carry the resolved cohort (#560)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStrategiesClient.create.mockResolvedValue(STRATEGY);
    mockStrategiesClient.putDraft.mockResolvedValue(undefined);
    mockBacktestsClient.create.mockResolvedValue(CREATED_RUN);
    mockBacktestsClient.get.mockResolvedValue(COMPLETED_RUN);
    mockUsersClient.completeOnboarding.mockResolvedValue(undefined);
  });

  it("fires strategy_created and auto_backtest_started carrying the persisted wizard entry path and its manual authoring mode", async () => {
    render(
      <StrategyWizard
        isFirstRun
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onSkipToCanvas={vi.fn()}
      />
    );

    vi.useFakeTimers();
    try {
      await completeFirstRunWizard();
    } finally {
      vi.useRealTimers();
    }

    const cohort = expect.objectContaining({ entry_path: "wizard", authoring_mode: "manual" });
    expect(mockTrackEvent).toHaveBeenCalledWith("strategy_created", cohort, "user-1");
    expect(mockTrackEvent).toHaveBeenCalledWith("auto_backtest_started", cohort, "user-1");
  });

  it("resolves a null persisted entry path into the unknown cohort instead of a guessed literal", async () => {
    mockStrategiesClient.create.mockResolvedValue({ ...STRATEGY, entry_path: null });

    render(
      <StrategyWizard
        isFirstRun
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onSkipToCanvas={vi.fn()}
      />
    );

    vi.useFakeTimers();
    try {
      await completeFirstRunWizard();
    } finally {
      vi.useRealTimers();
    }

    const unknownCohort = expect.objectContaining({ entry_path: "unknown", authoring_mode: "unknown" });
    expect(mockTrackEvent).toHaveBeenCalledWith("strategy_created", unknownCohort, "user-1");
    expect(mockTrackEvent).toHaveBeenCalledWith("auto_backtest_started", unknownCohort, "user-1");
  });
});

describe("StrategyWizard — first-run enqueue routes through startAutoBacktest (#614)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStrategiesClient.create.mockResolvedValue(STRATEGY);
    mockStrategiesClient.putDraft.mockResolvedValue(undefined);
    mockBacktestsClient.create.mockResolvedValue(CREATED_RUN);
    mockBacktestsClient.get.mockResolvedValue(COMPLETED_RUN);
    mockUsersClient.completeOnboarding.mockResolvedValue(undefined);
  });

  it("calls startAutoBacktest with the strategy's entry path and the wizard_first_run source, preserving the 1-year window and auto_backtest_started telemetry", async () => {
    render(
      <StrategyWizard
        isFirstRun
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onSkipToCanvas={vi.fn()}
      />
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T12:00:00.000Z"));
    try {
      await completeFirstRunWizard();
    } finally {
      vi.useRealTimers();
    }

    expect(mockStartAutoBacktest).toHaveBeenCalledWith({
      strategyId: STRATEGY.id,
      entryPath: "wizard",
      source: "wizard_first_run",
      userId: "user-1",
    });

    // The 1-year window and the auto_backtest_started telemetry are now owned
    // by the helper — assert they remain unchanged for the wizard path.
    expect(mockBacktestsClient.create).toHaveBeenCalledWith({
      strategy_id: STRATEGY.id,
      date_from: "2025-06-11T12:00:00.000Z",
      date_to: "2026-06-11T12:00:00.000Z",
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "auto_backtest_started",
      expect.objectContaining({
        source: "wizard_first_run",
        entry_path: "wizard",
        authoring_mode: "manual",
      }),
      "user-1"
    );
  });

  it("does not call startAutoBacktest when the wizard completes a non-first run", async () => {
    const onComplete = vi.fn();

    render(<StrategyWizard onClose={vi.fn()} onComplete={onComplete} />);

    const nameInput = screen.getByPlaceholderText("e.g., BTC MA Crossover Daily");
    fireEvent.change(nameInput, { target: { value: "My BTC Strategy" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create Strategy" }));
    });

    expect(onComplete).toHaveBeenCalledWith(STRATEGY.id);
    expect(mockStartAutoBacktest).not.toHaveBeenCalled();
    expect(mockBacktestsClient.create).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      "auto_backtest_started",
      expect.anything(),
      expect.anything()
    );
  });
});
