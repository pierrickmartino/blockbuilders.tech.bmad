/**
 * Tests for useStrategyDraft hook (issue #458).
 *
 * Covers: persist triggers API call, success/error state transitions.
 * Uses vi.useFakeTimers to control debounce without real waiting.
 */

import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStrategyDraft } from "../use-strategy-draft";
import * as api from "@/lib/api";
import type { Node, Edge } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);
const mockApiFetchVoid = vi.mocked(api.apiFetchVoid);

function makeNode(id: string): Node {
  return { id, type: "default", position: { x: 0, y: 0 }, data: {} };
}

const NODES: Node[] = [makeNode("n1")];
const EDGES: Edge[] = [];

const STRATEGY_ID = "strategy-abc-123";

const VALIDATE_RESPONSE_CLEAN = { status: "valid", errors: [] };

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ---------------------------------------------------------------------------
// Slice F5 — persist triggers PUT /draft API call
// ---------------------------------------------------------------------------

describe("useStrategyDraft – persistDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockApiFetchVoid.mockResolvedValue(undefined);
    mockApiFetch.mockResolvedValue(VALIDATE_RESPONSE_CLEAN);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("calls PUT /strategies/{id}/draft with the definition", async () => {
    const { result } = renderHook(
      () => useStrategyDraft({ strategyId: STRATEGY_ID }),
      { wrapper }
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    expect(mockApiFetchVoid).toHaveBeenCalledWith(
      `/strategies/${STRATEGY_ID}/draft`,
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("passes definition_json in the request body", async () => {
    const { result } = renderHook(
      () => useStrategyDraft({ strategyId: STRATEGY_ID }),
      { wrapper }
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    const call = mockApiFetchVoid.mock.calls[0];
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body).toHaveProperty("definition_json");
  });
});

// ---------------------------------------------------------------------------
// Slice F6 — success transitions to "persisted"
// ---------------------------------------------------------------------------

describe("useStrategyDraft – success transitions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockApiFetchVoid.mockResolvedValue(undefined);
    mockApiFetch.mockResolvedValue(VALIDATE_RESPONSE_CLEAN);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("starts with idle status", () => {
    const { result } = renderHook(
      () => useStrategyDraft({ strategyId: STRATEGY_ID }),
      { wrapper }
    );
    expect(result.current.draftStatus).toBe("idle");
  });

  it("transitions to persisted after a successful API call", async () => {
    const { result } = renderHook(
      () => useStrategyDraft({ strategyId: STRATEGY_ID }),
      { wrapper }
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    expect(result.current.draftStatus).toBe("persisted");
  });

  it("sets lastPersistedAt after success", async () => {
    const { result } = renderHook(
      () => useStrategyDraft({ strategyId: STRATEGY_ID }),
      { wrapper }
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    expect(result.current.lastPersistedAt).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice F7 — error transitions to "error"
// ---------------------------------------------------------------------------

describe("useStrategyDraft – error transitions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockApiFetchVoid.mockRejectedValue(new Error("Network error"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("transitions to error when API call fails", async () => {
    const { result } = renderHook(
      () => useStrategyDraft({ strategyId: STRATEGY_ID }),
      { wrapper }
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    expect(result.current.draftStatus).toBe("error");
  });

  it("stores the error message", async () => {
    const { result } = renderHook(
      () => useStrategyDraft({ strategyId: STRATEGY_ID }),
      { wrapper }
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    expect(result.current.draftError).toBe("Network error");
  });
});
