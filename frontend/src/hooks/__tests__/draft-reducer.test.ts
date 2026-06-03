/**
 * Tests for draftReducer — pure state machine (issue #458, simplified in #516).
 *
 * Vertical TDD slices. No React needed: the reducer is a plain function.
 *
 * State machine: idle → saving → saved → error
 * Publish states removed per ADR-0005.
 */

import { describe, it, expect } from "vitest";
import { draftReducer, initialDraftState } from "../draft-reducer";
import type { DraftState } from "../draft-reducer";

// ---------------------------------------------------------------------------
// Slice F1 — initial state
// ---------------------------------------------------------------------------

describe("draftReducer – initial state", () => {
  it("has status idle", () => {
    expect(initialDraftState.status).toBe("idle");
  });

  it("has null lastSavedAt", () => {
    expect(initialDraftState.lastSavedAt).toBeNull();
  });

  it("has null error", () => {
    expect(initialDraftState.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice F2 — SAVE_START
// ---------------------------------------------------------------------------

describe("draftReducer – SAVE_START", () => {
  it("transitions idle → saving", () => {
    const next = draftReducer(initialDraftState, { type: "SAVE_START" });
    expect(next.status).toBe("saving");
  });

  it("transitions error → saving (retry)", () => {
    const errorState: DraftState = {
      status: "error",
      lastSavedAt: null,
      error: "previous error",
    };
    const next = draftReducer(errorState, { type: "SAVE_START" });
    expect(next.status).toBe("saving");
  });

  it("clears error on SAVE_START", () => {
    const errorState: DraftState = {
      status: "error",
      lastSavedAt: null,
      error: "previous error",
    };
    const next = draftReducer(errorState, { type: "SAVE_START" });
    expect(next.error).toBeNull();
  });

  it("is a pure function — does not mutate the input state", () => {
    const before = { ...initialDraftState };
    draftReducer(initialDraftState, { type: "SAVE_START" });
    expect(initialDraftState).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Slice F3 — SAVE_SUCCESS
// ---------------------------------------------------------------------------

describe("draftReducer – SAVE_SUCCESS", () => {
  const savingState: DraftState = {
    status: "saving",
    lastSavedAt: null,
    error: null,
  };

  it("transitions saving → saved", () => {
    const ts = new Date();
    const next = draftReducer(savingState, {
      type: "SAVE_SUCCESS",
      timestamp: ts,
    });
    expect(next.status).toBe("saved");
  });

  it("stores the provided timestamp as lastSavedAt", () => {
    const ts = new Date("2026-01-01T12:00:00Z");
    const next = draftReducer(savingState, {
      type: "SAVE_SUCCESS",
      timestamp: ts,
    });
    expect(next.lastSavedAt).toBe(ts);
  });

  it("clears error on success", () => {
    const errorSaving: DraftState = {
      status: "saving",
      lastSavedAt: null,
      error: "stale error",
    };
    const next = draftReducer(errorSaving, {
      type: "SAVE_SUCCESS",
      timestamp: new Date(),
    });
    expect(next.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice F4 — SAVE_ERROR
// ---------------------------------------------------------------------------

describe("draftReducer – SAVE_ERROR", () => {
  const savingState: DraftState = {
    status: "saving",
    lastSavedAt: null,
    error: null,
  };

  it("transitions saving → error", () => {
    const next = draftReducer(savingState, {
      type: "SAVE_ERROR",
      message: "Network timeout",
    });
    expect(next.status).toBe("error");
  });

  it("stores the error message", () => {
    const next = draftReducer(savingState, {
      type: "SAVE_ERROR",
      message: "Network timeout",
    });
    expect(next.error).toBe("Network timeout");
  });

  it("preserves lastSavedAt when error occurs", () => {
    const ts = new Date("2026-01-01T11:00:00Z");
    const savingWithPrior: DraftState = {
      status: "saving",
      lastSavedAt: ts,
      error: null,
    };
    const next = draftReducer(savingWithPrior, {
      type: "SAVE_ERROR",
      message: "timeout",
    });
    expect(next.lastSavedAt).toBe(ts);
  });
});

// ---------------------------------------------------------------------------
// Slice F5 — RESET
// ---------------------------------------------------------------------------

describe("draftReducer – RESET", () => {
  it("returns to initial state from any status", () => {
    const states: DraftState[] = [
      { status: "saving", lastSavedAt: null, error: null },
      { status: "saved", lastSavedAt: new Date(), error: null },
      { status: "error", lastSavedAt: null, error: "msg" },
    ];
    for (const s of states) {
      const next = draftReducer(s, { type: "RESET" });
      expect(next).toEqual(initialDraftState);
    }
  });
});
