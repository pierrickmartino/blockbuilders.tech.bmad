import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NewStrategyModal from "../new-strategy-modal";
import { StrategiesApiClient } from "@/lib/api/strategies-client";
import { trackEvent } from "@/lib/analytics";
import type { Strategy } from "@/types/strategy";

vi.mock("@/lib/api/strategies-client", () => ({
  StrategiesApiClient: {
    create: vi.fn(),
  },
}));

vi.mock("@/context/auth", () => ({
  useAuth: () => ({ user: { id: "user-1" }, refreshUsage: vi.fn() }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockStrategiesClient = vi.mocked(StrategiesApiClient);
const mockTrackEvent = vi.mocked(trackEvent);

const BASE_STRATEGY: Strategy = {
  id: "strategy-1",
  name: "My Strategy",
  asset: "BTC/USDT",
  timeframe: "1d",
  entry_path: "blank_canvas",
  is_archived: false,
  auto_update_enabled: false,
  auto_update_lookback_days: 90,
  last_auto_run_at: null,
  digest_email_enabled: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  tags: [],
};

function renderModal() {
  return render(
    <NewStrategyModal
      open
      onOpenChange={vi.fn()}
      onCreated={vi.fn()}
      onOpenWizard={vi.fn()}
    />
  );
}

async function submitModal() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "My Strategy" } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
}

describe("NewStrategyModal — strategy_created carries the resolved cohort (#560)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fires strategy_created carrying the persisted blank_canvas entry path and its manual authoring mode", async () => {
    mockStrategiesClient.create.mockResolvedValue(BASE_STRATEGY);
    renderModal();

    await submitModal();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "strategy_created",
        expect.objectContaining({ entry_path: "blank_canvas", authoring_mode: "manual" }),
        "user-1"
      );
    });
  });

  it("resolves a null persisted entry path into the unknown cohort instead of a guessed literal", async () => {
    mockStrategiesClient.create.mockResolvedValue({ ...BASE_STRATEGY, entry_path: null });
    renderModal();

    await submitModal();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "strategy_created",
        expect.objectContaining({ entry_path: "unknown", authoring_mode: "unknown" }),
        "user-1"
      );
    });
  });
});
