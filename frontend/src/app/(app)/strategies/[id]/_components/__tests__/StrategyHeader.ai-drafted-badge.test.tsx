/**
 * AI-drafted provenance badge on the canvas header (issue #601, ADR-0012,
 * CONTEXT.md → AI-drafted). A pure projection of `entry_path = nl_wedge`.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { StrategyHeader } from "../StrategyHeader";
import type { Strategy, StrategyVersion } from "@/types/strategy";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/StrategyTabs", () => ({
  StrategyTabs: () => <div data-testid="strategy-tabs" />,
}));

const BASE_STRATEGY: Strategy = {
  id: "strategy-1",
  name: "My Strategy",
  asset: "BTC/USDT",
  timeframe: "1d",
  entry_path: null,
  is_archived: false,
  auto_update_enabled: false,
  auto_update_lookback_days: 90,
  last_auto_run_at: null,
  digest_email_enabled: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  tags: [],
};

const VERSIONS: StrategyVersion[] = [];

function renderHeader(strategy: Strategy) {
  render(
    <StrategyHeader
      strategy={strategy}
      strategyId={strategy.id}
      versions={VERSIONS}
      selectedVersion={null}
      timezone="utc"
      editingName={false}
      nameInput={strategy.name}
      isSavingName={false}
      onEditingNameChange={vi.fn()}
      onNameChange={vi.fn()}
      onNameSave={vi.fn()}
      draftStatus="idle"
      lastSavedAt={null}
      relativeTimestamp="just now"
      onLoadVersion={vi.fn()}
      isUpdatingAutoUpdate={false}
      onExport={vi.fn()}
      onAutoUpdateToggle={vi.fn()}
      onLookbackChange={vi.fn()}
      onSettingsOpen={vi.fn()}
      error={null}
      validationErrors={[]}
      saveMessage={null}
      onErrorDismiss={vi.fn()}
      onMessageDismiss={vi.fn()}
      onJumpToError={vi.fn()}
    />
  );
}

describe("StrategyHeader – AI-drafted badge", () => {
  it('shows the "AI-drafted" badge when entry_path is nl_wedge', () => {
    renderHeader({ ...BASE_STRATEGY, entry_path: "nl_wedge" });

    expect(screen.getByText("AI-drafted")).toBeInTheDocument();
  });

  it("does not show the badge for any other entry_path", () => {
    renderHeader({ ...BASE_STRATEGY, entry_path: null });

    expect(screen.queryByText("AI-drafted")).not.toBeInTheDocument();
  });

  it("keeps showing the badge after the strategy is edited (origin survives Edit)", () => {
    // An edited NL-wedge strategy still has entry_path = nl_wedge — the
    // badge tracks origin, not authoring_mode, so it must persist.
    renderHeader({
      ...BASE_STRATEGY,
      entry_path: "nl_wedge",
      updated_at: "2026-06-11T12:00:00Z",
    });

    expect(screen.getByText("AI-drafted")).toBeInTheDocument();
  });
});
