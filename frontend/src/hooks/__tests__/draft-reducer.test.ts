/**
 * Tests for draftReducer — pure state machine (issue #458).
 *
 * Vertical TDD slices. No React needed: the reducer is a plain function.
 */

import { describe, it, expect } from "vitest";
import { draftReducer, initialDraftState } from "../draft-reducer";
import type { DraftState, DraftAction } from "../draft-reducer";

// ---------------------------------------------------------------------------
// Slice F1 — initial state
// ---------------------------------------------------------------------------

describe("draftReducer – initial state", () => {
  it("has status idle", () => {
    expect(initialDraftState.status).toBe("idle");
  });

  it("has null lastPersistedAt", () => {
    expect(initialDraftState.lastPersistedAt).toBeNull();
  });

  it("has null error", () => {
    expect(initialDraftState.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice F2 — PERSIST_START
// ---------------------------------------------------------------------------

describe("draftReducer – PERSIST_START", () => {
  it("transitions idle → persisting", () => {
    const next = draftReducer(initialDraftState, { type: "PERSIST_START" });
    expect(next.status).toBe("persisting");
  });

  it("transitions error → persisting (retry)", () => {
    const errorState: DraftState = {
      status: "error",
      lastPersistedAt: null,
      error: "previous error",
    };
    const next = draftReducer(errorState, { type: "PERSIST_START" });
    expect(next.status).toBe("persisting");
  });

  it("clears error on PERSIST_START", () => {
    const errorState: DraftState = {
      status: "error",
      lastPersistedAt: null,
      error: "previous error",
    };
    const next = draftReducer(errorState, { type: "PERSIST_START" });
    expect(next.error).toBeNull();
  });

  it("is a pure function — does not mutate the input state", () => {
    const before = { ...initialDraftState };
    draftReducer(initialDraftState, { type: "PERSIST_START" });
    expect(initialDraftState).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Slice F3 — PERSIST_SUCCESS
// ---------------------------------------------------------------------------

describe("draftReducer – PERSIST_SUCCESS", () => {
  const persistingState: DraftState = {
    status: "persisting",
    lastPersistedAt: null,
    error: null,
  };

  it("transitions persisting → persisted", () => {
    const ts = new Date();
    const next = draftReducer(persistingState, {
      type: "PERSIST_SUCCESS",
      timestamp: ts,
    });
    expect(next.status).toBe("persisted");
  });

  it("stores the provided timestamp as lastPersistedAt", () => {
    const ts = new Date("2026-01-01T12:00:00Z");
    const next = draftReducer(persistingState, {
      type: "PERSIST_SUCCESS",
      timestamp: ts,
    });
    expect(next.lastPersistedAt).toBe(ts);
  });

  it("clears error on success", () => {
    const errorPersisting: DraftState = {
      status: "persisting",
      lastPersistedAt: null,
      error: "stale error",
    };
    const next = draftReducer(errorPersisting, {
      type: "PERSIST_SUCCESS",
      timestamp: new Date(),
    });
    expect(next.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice F4 — PERSIST_ERROR
// ---------------------------------------------------------------------------

describe("draftReducer – PERSIST_ERROR", () => {
  const persistingState: DraftState = {
    status: "persisting",
    lastPersistedAt: null,
    error: null,
  };

  it("transitions persisting → error", () => {
    const next = draftReducer(persistingState, {
      type: "PERSIST_ERROR",
      message: "Network timeout",
    });
    expect(next.status).toBe("error");
  });

  it("stores the error message", () => {
    const next = draftReducer(persistingState, {
      type: "PERSIST_ERROR",
      message: "Network timeout",
    });
    expect(next.error).toBe("Network timeout");
  });

  it("preserves lastPersistedAt when error occurs", () => {
    const ts = new Date("2026-01-01T11:00:00Z");
    const persistingWithPrior: DraftState = {
      status: "persisting",
      lastPersistedAt: ts,
      error: null,
    };
    const next = draftReducer(persistingWithPrior, {
      type: "PERSIST_ERROR",
      message: "timeout",
    });
    expect(next.lastPersistedAt).toBe(ts);
  });
});

// ---------------------------------------------------------------------------
// Slice F5 — RESET
// ---------------------------------------------------------------------------

describe("draftReducer – RESET", () => {
  it("returns to initial state from any status", () => {
    const states: DraftState[] = [
      { status: "persisting", lastPersistedAt: null, error: null },
      { status: "persisted", lastPersistedAt: new Date(), error: null },
      { status: "error", lastPersistedAt: null, error: "msg" },
    ];
    for (const s of states) {
      const next = draftReducer(s, { type: "RESET" });
      expect(next).toEqual(initialDraftState);
    }
  });
});
