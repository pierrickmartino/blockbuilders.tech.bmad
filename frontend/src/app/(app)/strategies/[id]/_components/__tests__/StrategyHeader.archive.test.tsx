/**
 * Tests for StrategyHeader archive version behavior (issue #461).
 *
 * Verifies that each published version has an archive action,
 * that clicking it shows a confirmation dialog, and that confirming
 * invokes onArchiveVersion with the correct version number.
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
  is_archived: false,
  auto_update_enabled: false,
  auto_update_lookback_days: 90,
  last_auto_run_at: null,
  digest_email_enabled: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  tags: [],
};

// Ordered descending — matches the real API response (ORDER BY version_number DESC)
const VERSIONS: StrategyVersion[] = [
  { id: "v2", version_number: 2, created_at: "2026-01-02T10:00:00Z" },
  { id: "v1", version_number: 1, created_at: "2026-01-01T10:00:00Z" },
];

function renderHeader(overrides: {
  versions?: StrategyVersion[];
  onArchiveVersion?: (versionNumber: number) => void;
} = {}) {
  const onArchiveVersion = overrides.onArchiveVersion ?? vi.fn();

  const props = {
    strategy: STRATEGY,
    strategyId: STRATEGY.id,
    versions: overrides.versions ?? VERSIONS,
    selectedVersion: null,
    timezone: "utc" as const,
    editingName: false,
    nameInput: STRATEGY.name,
    isSavingName: false,
    onEditingNameChange: vi.fn(),
    onNameChange: vi.fn(),
    onNameSave: vi.fn(),
    draftStatus: "saved" as const,
    lastSavedAt: new Date("2026-01-01T12:00:00Z"),
    relativeTimestamp: "just now",
    onLoadVersion: vi.fn(),
    onArchiveVersion,
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
  return { onArchiveVersion };
}

// ---------------------------------------------------------------------------
// Helpers — open the version history Sheet
// ---------------------------------------------------------------------------

function openVersionSheet() {
  const historyButton = screen.getByRole("button", { name: /version history/i });
  fireEvent.click(historyButton);
}

// ---------------------------------------------------------------------------
// Slice F10 — Archive action is visible for each version in the Sheet
// ---------------------------------------------------------------------------

describe("StrategyHeader – archive action in version Sheet", () => {
  it("shows an archive button for each version row", () => {
    renderHeader();
    openVersionSheet();

    // Each version row should have an archive button
    const archiveButtons = screen.getAllByRole("button", { name: /archive version/i });
    expect(archiveButtons).toHaveLength(VERSIONS.length);
  });
});

// ---------------------------------------------------------------------------
// Slice F11 — Clicking archive shows confirmation dialog
// ---------------------------------------------------------------------------

describe("StrategyHeader – archive confirmation dialog", () => {
  it("opens an AlertDialog when the archive button is clicked", () => {
    renderHeader();
    openVersionSheet();

    const archiveButtons = screen.getAllByRole("button", { name: /archive version/i });
    fireEvent.click(archiveButtons[0]);

    // Confirmation dialog should appear
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("dialog references the correct version number", () => {
    renderHeader();
    openVersionSheet();

    // Click archive for version 2 (first in list since ordered desc)
    const archiveButtons = screen.getAllByRole("button", { name: /archive version/i });
    fireEvent.click(archiveButtons[0]);

    // Dialog should mention the version number
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/version 2/i);
  });

  it("cancelling the dialog does NOT call onArchiveVersion", () => {
    const { onArchiveVersion } = renderHeader();
    openVersionSheet();

    const archiveButtons = screen.getAllByRole("button", { name: /archive version/i });
    fireEvent.click(archiveButtons[0]);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onArchiveVersion).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Slice F12 — Confirming archive calls onArchiveVersion with version number
// ---------------------------------------------------------------------------

describe("StrategyHeader – confirmed archive", () => {
  it("calls onArchiveVersion with the version number when confirmed", () => {
    const { onArchiveVersion } = renderHeader();
    openVersionSheet();

    // VERSIONS is ordered desc: first button → version 2
    const archiveButtons = screen.getAllByRole("button", { name: /archive version/i });
    fireEvent.click(archiveButtons[0]);

    const confirmButton = screen.getByRole("button", { name: /^archive$/i });
    fireEvent.click(confirmButton);

    expect(onArchiveVersion).toHaveBeenCalledWith(2);
  });

  it("calls onArchiveVersion with the correct number for second version", () => {
    const { onArchiveVersion } = renderHeader();
    openVersionSheet();

    // Second button → version 1
    const archiveButtons = screen.getAllByRole("button", { name: /archive version/i });
    fireEvent.click(archiveButtons[1]);

    const confirmButton = screen.getByRole("button", { name: /^archive$/i });
    fireEvent.click(confirmButton);

    expect(onArchiveVersion).toHaveBeenCalledWith(1);
  });
});
