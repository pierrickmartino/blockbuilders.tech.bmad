/**
 * Tests for StrategyHeader publish gate behavior (issue #460).
 *
 * Verifies that the Publish button is disabled and communicates why
 * when validation errors are present.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { StrategyHeader } from "../StrategyHeader";
import type { Strategy } from "@/types/strategy";
import type { ValidationError } from "@/types/canvas";

// ---------------------------------------------------------------------------
// Mocks — isolate from Next.js router and StrategyTabs context
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
// Helpers
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

const VALIDATION_ERROR: ValidationError = {
  code: "MISSING_ENTRY",
  message: "At least one Entry Signal block is required",
  user_message: "Add an entry signal to continue.",
};

function renderHeader(overrides: { validationErrors?: ValidationError[]; hasDraft?: boolean } = {}) {
  const props = {
    strategy: STRATEGY,
    strategyId: STRATEGY.id,
    versions: [],
    selectedVersion: null,
    timezone: "utc" as const,
    editingName: false,
    nameInput: STRATEGY.name,
    isSavingName: false,
    onEditingNameChange: vi.fn(),
    onNameChange: vi.fn(),
    onNameSave: vi.fn(),
    draftStatus: "persisted" as const,
    lastPersistedAt: new Date("2026-01-01T12:00:00Z"),
    relativeTimestamp: "just now",
    hasDraft: overrides.hasDraft ?? true,
    onPublish: vi.fn(),
    onLoadVersion: vi.fn(),
    onArchiveVersion: vi.fn(),
    isUpdatingAutoUpdate: false,
    onExport: vi.fn(),
    onAutoUpdateToggle: vi.fn(),
    onLookbackChange: vi.fn(),
    onSettingsOpen: vi.fn(),
    error: null,
    validationErrors: overrides.validationErrors ?? [],
    saveMessage: null,
    onErrorDismiss: vi.fn(),
    onMessageDismiss: vi.fn(),
    onJumpToError: vi.fn(),
  };

  render(<StrategyHeader {...props} />);
}

// ---------------------------------------------------------------------------
// Slice F8 — Publish button is disabled when validation errors exist
// ---------------------------------------------------------------------------

describe("StrategyHeader – Publish button gate", () => {
  it("is enabled when hasDraft=true and no validation errors", () => {
    renderHeader({ validationErrors: [], hasDraft: true });
    expect(screen.getByRole("button", { name: /publish/i })).not.toBeDisabled();
  });

  it("is disabled when validation errors are present", () => {
    renderHeader({ validationErrors: [VALIDATION_ERROR], hasDraft: true });
    expect(screen.getByRole("button", { name: /publish/i })).toBeDisabled();
  });

  it("remains disabled when no draft exists (independent of validation errors)", () => {
    renderHeader({ validationErrors: [], hasDraft: false });
    expect(screen.getByRole("button", { name: /publish/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Slice F9 — Publish button tooltip communicates validation error count
// ---------------------------------------------------------------------------

describe("StrategyHeader – Publish button tooltip", () => {
  it("shows error count in title when validation errors block publishing", () => {
    renderHeader({ validationErrors: [VALIDATION_ERROR], hasDraft: true });
    const button = screen.getByRole("button", { name: /publish/i });
    expect(button).toHaveAttribute("title");
    // The title should communicate the error count
    expect(button.getAttribute("title")).toMatch(/1/);
  });

  it("shows plural 'errors' for multiple validation errors", () => {
    const twoErrors = [VALIDATION_ERROR, { ...VALIDATION_ERROR, code: "MISSING_EXIT" }];
    renderHeader({ validationErrors: twoErrors, hasDraft: true });
    const button = screen.getByRole("button", { name: /publish/i });
    expect(button.getAttribute("title")).toMatch(/2/);
  });

  it("has no blocking title when no validation errors exist and draft is ready", () => {
    renderHeader({ validationErrors: [], hasDraft: true });
    const button = screen.getByRole("button", { name: /publish/i });
    // Should have no title or an empty/undefined title when nothing is blocking
    const title = button.getAttribute("title");
    expect(title == null || title === "").toBe(true);
  });
});
