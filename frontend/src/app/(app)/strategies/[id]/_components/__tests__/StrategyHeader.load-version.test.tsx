/**
 * Tests for StrategyHeader "load version with active draft" warning (issue #462, updated #516).
 *
 * The header computes `hasDraft` internally from lastSavedAt / draftStatus.
 * - hasDraft=true when lastSavedAt is set (saved draft exists)
 * - hasDraft=false when lastSavedAt is null and status is idle
 *
 * When a draft exists and the user tries to load a version, a warning dialog
 * must appear. When no draft exists, the version loads immediately.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { StrategyHeader } from "../StrategyHeader";
import type { Strategy, StrategyVersion } from "@/types/strategy";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STRATEGY: Strategy = {
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

const VERSIONS: StrategyVersion[] = [
  { id: "v2", version_number: 2, created_at: "2026-01-02T10:00:00Z" },
  { id: "v1", version_number: 1, created_at: "2026-01-01T10:00:00Z" },
];

/** hasDraft=false: lastSavedAt null + status idle */
const NO_DRAFT_PROPS = {
  draftStatus: "idle" as const,
  lastSavedAt: null,
};

/** hasDraft=true: a saved timestamp present */
const HAS_DRAFT_PROPS = {
  draftStatus: "saved" as const,
  lastSavedAt: new Date("2026-01-01T12:00:00Z"),
};

function renderHeader(overrides: {
  hasDraft?: boolean;
  onLoadVersion?: (versionNumber: number) => void;
} = {}) {
  const onLoadVersion = overrides.onLoadVersion ?? vi.fn();
  const draftProps = overrides.hasDraft === false ? NO_DRAFT_PROPS : HAS_DRAFT_PROPS;

  const props = {
    strategy: STRATEGY,
    strategyId: STRATEGY.id,
    versions: VERSIONS,
    selectedVersion: null,
    timezone: "utc" as const,
    editingName: false,
    nameInput: STRATEGY.name,
    isSavingName: false,
    onEditingNameChange: vi.fn(),
    onNameChange: vi.fn(),
    onNameSave: vi.fn(),
    ...draftProps,
    relativeTimestamp: "just now",
    onLoadVersion,
    isUpdatingAutoUpdate: false,
    onExport: vi.fn(),
    onAutoUpdateToggle: vi.fn(),
    onLookbackChange: vi.fn(),
    onSettingsOpen: vi.fn(),
    error: null,
    validationErrors: [],
    saveMessage: null,
    onErrorDismiss: vi.fn(),
    onMessageDismiss: vi.fn(),
    onJumpToError: vi.fn(),
  };

  render(<StrategyHeader {...props} />);
  return { onLoadVersion };
}

// ---------------------------------------------------------------------------
// Helper — open the version history Sheet
// ---------------------------------------------------------------------------

function openVersionSheet() {
  const historyButton = screen.getByRole("button", { name: /version history/i });
  fireEvent.click(historyButton);
}

// ---------------------------------------------------------------------------
// Slice F13 — No draft: load fires immediately without dialog
// ---------------------------------------------------------------------------

describe("StrategyHeader – load version without active draft", () => {
  it("calls onLoadVersion immediately when no draft exists", () => {
    const { onLoadVersion } = renderHeader({ hasDraft: false });
    openVersionSheet();

    const loadButtons = screen.getAllByRole("button", { name: /^load$/i });
    fireEvent.click(loadButtons[0]);

    expect(onLoadVersion).toHaveBeenCalledWith(2);
    expect(onLoadVersion).toHaveBeenCalledTimes(1);
  });

  it("does NOT show a confirmation dialog when no draft exists", () => {
    renderHeader({ hasDraft: false });
    openVersionSheet();

    const loadButtons = screen.getAllByRole("button", { name: /^load$/i });
    fireEvent.click(loadButtons[0]);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Slice F14 — Draft exists: warning dialog appears before loading
// ---------------------------------------------------------------------------

describe("StrategyHeader – load version with active draft shows warning", () => {
  it("opens an AlertDialog when draft exists and Load is clicked", () => {
    renderHeader({ hasDraft: true });
    openVersionSheet();

    const loadButtons = screen.getAllByRole("button", { name: /^load$/i });
    fireEvent.click(loadButtons[0]);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("does NOT immediately call onLoadVersion when draft exists", () => {
    const { onLoadVersion } = renderHeader({ hasDraft: true });
    openVersionSheet();

    const loadButtons = screen.getAllByRole("button", { name: /^load$/i });
    fireEvent.click(loadButtons[0]);

    expect(onLoadVersion).not.toHaveBeenCalled();
  });

  it("dialog warns that loading will replace the draft", () => {
    renderHeader({ hasDraft: true });
    openVersionSheet();

    const loadButtons = screen.getAllByRole("button", { name: /^load$/i });
    fireEvent.click(loadButtons[0]);

    expect(screen.getByRole("alertdialog")).toHaveTextContent(/replace/i);
  });
});

// ---------------------------------------------------------------------------
// Slice F15 — Cancelling the dialog: version does NOT load
// ---------------------------------------------------------------------------

describe("StrategyHeader – cancel load-version dialog", () => {
  it("does not call onLoadVersion when the user cancels", () => {
    const { onLoadVersion } = renderHeader({ hasDraft: true });
    openVersionSheet();

    const loadButtons = screen.getAllByRole("button", { name: /^load$/i });
    fireEvent.click(loadButtons[0]);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onLoadVersion).not.toHaveBeenCalled();
  });

  it("closes the dialog after cancelling", () => {
    renderHeader({ hasDraft: true });
    openVersionSheet();

    const loadButtons = screen.getAllByRole("button", { name: /^load$/i });
    fireEvent.click(loadButtons[0]);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Slice F16 — Confirming the dialog: version loads with correct number
// ---------------------------------------------------------------------------

describe("StrategyHeader – confirm load-version dialog", () => {
  it("calls onLoadVersion with version 2 when confirming for first row", () => {
    const { onLoadVersion } = renderHeader({ hasDraft: true });
    openVersionSheet();

    const loadButtons = screen.getAllByRole("button", { name: /^load$/i });
    fireEvent.click(loadButtons[0]);

    const confirmButton = screen.getByRole("button", { name: /^load version$/i });
    fireEvent.click(confirmButton);

    expect(onLoadVersion).toHaveBeenCalledWith(2);
    expect(onLoadVersion).toHaveBeenCalledTimes(1);
  });

  it("calls onLoadVersion with version 1 when confirming for second row", () => {
    const { onLoadVersion } = renderHeader({ hasDraft: true });
    openVersionSheet();

    const loadButtons = screen.getAllByRole("button", { name: /^load$/i });
    fireEvent.click(loadButtons[1]);

    const confirmButton = screen.getByRole("button", { name: /^load version$/i });
    fireEvent.click(confirmButton);

    expect(onLoadVersion).toHaveBeenCalledWith(1);
  });

  it("closes the dialog after confirming", () => {
    renderHeader({ hasDraft: true });
    openVersionSheet();

    const loadButtons = screen.getAllByRole("button", { name: /^load$/i });
    fireEvent.click(loadButtons[0]);

    const confirmButton = screen.getByRole("button", { name: /^load version$/i });
    fireEvent.click(confirmButton);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
