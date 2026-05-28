/**
 * Tests for useStrategyDraft hook (issue #458).
 *
 * Covers: persist triggers API call, success/error state transitions.
 * Uses vi.useFakeTimers to control debounce without real waiting.
 */

import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useStrategyDraft } from "../use-strategy-draft";
import { apiFetch } from "@/lib/api";
import type { Node, Edge } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);

function makeNode(id: string): Node {
  return { id, type: "default", position: { x: 0, y: 0 }, data: {} };
}

const NODES: Node[] = [makeNode("n1")];
const EDGES: Edge[] = [];

const STRATEGY_ID = "strategy-abc-123";

const DRAFT_RESPONSE = {
  id: "draft-id-xyz",
  version_number: 0,
  definition_json: { blocks: [], connections: [], meta: {} },
  created_at: "2026-01-01T12:00:00Z",
  status: "draft",
};

// ---------------------------------------------------------------------------
// Slice F5 — persist triggers PUT /draft API call
// ---------------------------------------------------------------------------

describe("useStrategyDraft – persistDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockApiFetch.mockResolvedValue(DRAFT_RESPONSE);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("calls PUT /strategies/{id}/draft with the definition", async () => {
    const { result } = renderHook(() =>
      useStrategyDraft({ strategyId: STRATEGY_ID })
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      `/strategies/${STRATEGY_ID}/draft`,
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("passes definition_json in the request body", async () => {
    const { result } = renderHook(() =>
      useStrategyDraft({ strategyId: STRATEGY_ID })
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    const call = mockApiFetch.mock.calls[0];
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
    mockApiFetch.mockResolvedValue(DRAFT_RESPONSE);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("starts with idle status", () => {
    const { result } = renderHook(() =>
      useStrategyDraft({ strategyId: STRATEGY_ID })
    );
    expect(result.current.draftStatus).toBe("idle");
  });

  it("transitions to persisted after a successful API call", async () => {
    const { result } = renderHook(() =>
      useStrategyDraft({ strategyId: STRATEGY_ID })
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    expect(result.current.draftStatus).toBe("persisted");
  });

  it("sets lastPersistedAt after success", async () => {
    const { result } = renderHook(() =>
      useStrategyDraft({ strategyId: STRATEGY_ID })
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
    mockApiFetch.mockRejectedValue(new Error("Network error"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("transitions to error when API call fails", async () => {
    const { result } = renderHook(() =>
      useStrategyDraft({ strategyId: STRATEGY_ID })
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    expect(result.current.draftStatus).toBe("error");
  });

  it("stores the error message", async () => {
    const { result } = renderHook(() =>
      useStrategyDraft({ strategyId: STRATEGY_ID })
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    expect(result.current.draftError).toBe("Network error");
  });
});
