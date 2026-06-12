import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import DraftFromNlPage from "../page";
import { StrategiesApiClient } from "@/lib/api/strategies-client";
import { trackEvent } from "@/lib/analytics";
import { markDraftUnderReview } from "@/lib/draft-review-storage";
import { startAutoBacktest } from "@/lib/start-auto-backtest";
import { ApiError } from "@/lib/api";
import type { StrategyDraftFromNlResponse } from "@/types/strategy";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api/strategies-client", () => ({
  StrategiesApiClient: {
    draftFromNl: vi.fn(),
  },
}));

vi.mock("@/context/auth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/draft-review-storage", () => ({
  markDraftUnderReview: vi.fn(),
}));

vi.mock("@/lib/start-auto-backtest", () => ({
  startAutoBacktest: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockStrategiesClient = vi.mocked(StrategiesApiClient);
const mockTrackEvent = vi.mocked(trackEvent);
const mockMarkDraftUnderReview = vi.mocked(markDraftUnderReview);
const mockStartAutoBacktest = vi.mocked(startAutoBacktest);
const mockToast = vi.mocked(toast);

function fillAndSubmit(nlText = "buy when RSI is oversold") {
  fireEvent.change(screen.getByLabelText(/describe your strategy/i), {
    target: { value: nlText },
  });
  fireEvent.click(screen.getByRole("button", { name: /generate strategy/i }));
}

describe("DraftFromNlPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the NL textarea, asset picker, timeframe selector, and submit button", () => {
    render(<DraftFromNlPage />);

    expect(screen.getByLabelText(/describe your strategy/i)).toBeInTheDocument();
    expect(screen.getByText("Asset")).toBeInTheDocument();
    expect(screen.getByText("Timeframe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate strategy/i })).toBeInTheDocument();
  });

  it("does not fire nl_draft_requested when the description is empty", () => {
    render(<DraftFromNlPage />);
    fireEvent.click(screen.getByRole("button", { name: /generate strategy/i }));

    expect(screen.getByText(/describe your strategy first/i)).toBeInTheDocument();
    expect(mockStrategiesClient.draftFromNl).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalledWith("nl_draft_requested", expect.anything(), expect.anything());
  });

  it("submits nl_text with the selected asset/timeframe, shows a loading state, starts the auto-backtest, and navigates to the result page with the run preselected on success", async () => {
    let resolveDraft: (value: StrategyDraftFromNlResponse) => void = () => {};
    mockStrategiesClient.draftFromNl.mockReturnValue(
      new Promise<StrategyDraftFromNlResponse>((resolve) => {
        resolveDraft = resolve;
      })
    );
    mockStartAutoBacktest.mockResolvedValue({ runId: "run-1" });

    render(<DraftFromNlPage />);
    fillAndSubmit("buy when RSI is oversold");

    expect(mockStrategiesClient.draftFromNl).toHaveBeenCalledWith({
      nl_text: "buy when RSI is oversold",
      asset: "BTC/USDT",
      timeframe: "1d",
    });

    expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "nl_draft_requested",
      expect.objectContaining({ entry_path: "nl_wedge", authoring_mode: "nl" }),
      "user-1"
    );

    resolveDraft({ outcome: "success", strategy_id: "strategy-1", reason: null });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/strategies/strategy-1/backtest?run=run-1");
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "nl_draft_drafted",
      expect.objectContaining({ entry_path: "nl_wedge", authoring_mode: "nl" }),
      "user-1"
    );

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "strategy_created",
      expect.objectContaining({ entry_path: "nl_wedge", authoring_mode: "nl" }),
      "user-1"
    );

    expect(mockMarkDraftUnderReview).toHaveBeenCalledWith("strategy-1");

    expect(mockStartAutoBacktest).toHaveBeenCalledWith({
      strategyId: "strategy-1",
      entryPath: "nl_wedge",
      userId: "user-1",
    });

    expect(mockTrackEvent).not.toHaveBeenCalledWith("auto_backtest_completed", expect.anything(), expect.anything());
  });

  it("navigates to the result page without ?run= and shows a toast when the auto-backtest enqueue fails, leaving the strategy under review", async () => {
    mockStrategiesClient.draftFromNl.mockResolvedValue({
      outcome: "success",
      strategy_id: "strategy-1",
      reason: null,
    });
    mockStartAutoBacktest.mockRejectedValue(new Error("enqueue failed"));

    render(<DraftFromNlPage />);
    fillAndSubmit("buy when RSI is oversold");

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/strategies/strategy-1/backtest");
    });

    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("?run="));
    expect(mockMarkDraftUnderReview).toHaveBeenCalledWith("strategy-1");
    expect(mockToast.error).toHaveBeenCalledWith("Couldn't start the backtest — run it here");
  });

  it("shows the decline reason and a rephrase hint without navigating when the drafter declines", async () => {
    mockStrategiesClient.draftFromNl.mockResolvedValue({
      outcome: "declined",
      strategy_id: null,
      reason: "I can't express that with the available blocks yet.",
    });

    render(<DraftFromNlPage />);
    fillAndSubmit("do something impossible");

    await waitFor(() => {
      expect(screen.getByText("I can't express that with the available blocks yet.")).toBeInTheDocument();
    });
    expect(screen.getByText(/rephrasing your idea/i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "nl_draft_requested",
      expect.objectContaining({ entry_path: "nl_wedge", authoring_mode: "nl" }),
      "user-1"
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "nl_draft_declined",
      expect.objectContaining({ entry_path: "nl_wedge", authoring_mode: "nl" }),
      "user-1"
    );
    expect(mockTrackEvent).not.toHaveBeenCalledWith("nl_draft_drafted", expect.anything(), expect.anything());
    expect(mockTrackEvent).not.toHaveBeenCalledWith("nl_draft_errored", expect.anything(), expect.anything());
  });

  it("shows a transient retry message, distinct from a refusal, on infra failure", async () => {
    mockStrategiesClient.draftFromNl.mockRejectedValue(
      new ApiError(503, "Couldn't draft a strategy right now. Please try again in a moment.")
    );

    render(<DraftFromNlPage />);
    fillAndSubmit("buy when RSI drops below 30");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/try again in a moment/i);
    expect(alert).toHaveClass("text-destructive");
    expect(screen.queryByText(/rephrasing your idea/i)).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "nl_draft_requested",
      expect.objectContaining({ entry_path: "nl_wedge", authoring_mode: "nl" }),
      "user-1"
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "nl_draft_errored",
      expect.objectContaining({ entry_path: "nl_wedge", authoring_mode: "nl" }),
      "user-1"
    );
    expect(mockTrackEvent).not.toHaveBeenCalledWith("nl_draft_drafted", expect.anything(), expect.anything());
    expect(mockTrackEvent).not.toHaveBeenCalledWith("nl_draft_declined", expect.anything(), expect.anything());
  });

  it("shows a distinct 'slow down' message, separate from declined/disabled/error, on a 429", async () => {
    mockStrategiesClient.draftFromNl.mockRejectedValue(new ApiError(429, "Too many requests"));

    render(<DraftFromNlPage />);
    fillAndSubmit("buy when RSI drops below 30");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      /you're drafting ideas faster than we allow right now — try again shortly/i
    );
    expect(alert).not.toHaveClass("text-destructive");
    expect(alert).not.toHaveClass("text-amber-700");
    expect(screen.queryByText(/rephrasing your idea/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/not available/i)).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "nl_draft_requested",
      expect.objectContaining({ entry_path: "nl_wedge", authoring_mode: "nl" }),
      "user-1"
    );
    expect(mockTrackEvent).not.toHaveBeenCalledWith("nl_draft_drafted", expect.anything(), expect.anything());
    expect(mockTrackEvent).not.toHaveBeenCalledWith("nl_draft_declined", expect.anything(), expect.anything());
    expect(mockTrackEvent).not.toHaveBeenCalledWith("nl_draft_errored", expect.anything(), expect.anything());
  });

  it("shows a disabled message when the drafter feature flag is off", async () => {
    mockStrategiesClient.draftFromNl.mockResolvedValue({
      outcome: "disabled",
      strategy_id: null,
      reason: null,
    });

    render(<DraftFromNlPage />);
    fillAndSubmit("buy when RSI is oversold");

    await waitFor(() => {
      expect(screen.getByText(/not available/i)).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "nl_draft_requested",
      expect.objectContaining({ entry_path: "nl_wedge", authoring_mode: "nl" }),
      "user-1"
    );
    expect(mockTrackEvent).not.toHaveBeenCalledWith("nl_draft_drafted", expect.anything(), expect.anything());
    expect(mockTrackEvent).not.toHaveBeenCalledWith("nl_draft_declined", expect.anything(), expect.anything());
    expect(mockTrackEvent).not.toHaveBeenCalledWith("nl_draft_errored", expect.anything(), expect.anything());
  });
});
