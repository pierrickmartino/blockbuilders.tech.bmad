import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DraftFromNlPage from "../page";
import { StrategiesApiClient } from "@/lib/api/strategies-client";
import { trackEvent } from "@/lib/analytics";
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

const mockStrategiesClient = vi.mocked(StrategiesApiClient);
const mockTrackEvent = vi.mocked(trackEvent);

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

  it("submits nl_text with the selected asset/timeframe, shows a loading state, and navigates to the canvas on success", async () => {
    let resolveDraft: (value: StrategyDraftFromNlResponse) => void = () => {};
    mockStrategiesClient.draftFromNl.mockReturnValue(
      new Promise<StrategyDraftFromNlResponse>((resolve) => {
        resolveDraft = resolve;
      })
    );

    render(<DraftFromNlPage />);
    fillAndSubmit("buy when RSI is oversold");

    expect(mockStrategiesClient.draftFromNl).toHaveBeenCalledWith({
      nl_text: "buy when RSI is oversold",
      asset: "BTC/USDT",
      timeframe: "1d",
    });

    expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();

    resolveDraft({ outcome: "success", strategy_id: "strategy-1", reason: null });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/strategies/strategy-1");
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "strategy_created",
      expect.objectContaining({ entry_path: "nl_wedge", authoring_mode: "nl" }),
      "user-1"
    );
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
  });
});
