/**
 * Tests for useStrategyDraft live-validation feature (issue #460).
 *
 * After a successful draft persist, the hook must call POST /draft/validate
 * and surface the resulting errors via the onValidationErrors callback.
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

const VALIDATE_RESPONSE_CLEAN = {
  status: "valid",
  errors: [],
};

const SAMPLE_ERRORS = [
  {
    block_id: null,
    code: "MISSING_ENTRY",
    message: "At least one Entry Signal block is required",
    user_message: "Add an entry signal to continue.",
    help_link: "/strategy-guide#entry-signals",
  },
];

const VALIDATE_RESPONSE_ERRORS = {
  status: "invalid",
  errors: SAMPLE_ERRORS,
};

// ---------------------------------------------------------------------------
// Slice F6 — validate endpoint called after successful persist
// ---------------------------------------------------------------------------

describe("useStrategyDraft – live validation after persist", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("calls POST /draft/validate after a successful persist", async () => {
    mockApiFetch
      .mockResolvedValueOnce(DRAFT_RESPONSE)         // PUT /draft
      .mockResolvedValueOnce(VALIDATE_RESPONSE_CLEAN); // POST /draft/validate

    const { result } = renderHook(() =>
      useStrategyDraft({ strategyId: STRATEGY_ID })
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(2);
    expect(mockApiFetch).toHaveBeenNthCalledWith(
      2,
      `/strategies/${STRATEGY_ID}/draft/validate`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("does NOT call validate when persist fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() =>
      useStrategyDraft({ strategyId: STRATEGY_ID })
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    // Only the failed PUT /draft call — no validate call
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Slice F7 — validation errors surfaced via onValidationErrors callback
// ---------------------------------------------------------------------------

describe("useStrategyDraft – onValidationErrors callback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("invokes onValidationErrors with errors when draft is invalid", async () => {
    mockApiFetch
      .mockResolvedValueOnce(DRAFT_RESPONSE)
      .mockResolvedValueOnce(VALIDATE_RESPONSE_ERRORS);

    const onValidationErrors = vi.fn();

    const { result } = renderHook(() =>
      useStrategyDraft({ strategyId: STRATEGY_ID, onValidationErrors })
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    expect(onValidationErrors).toHaveBeenCalledOnce();
    expect(onValidationErrors).toHaveBeenCalledWith(SAMPLE_ERRORS);
  });

  it("invokes onValidationErrors with empty array when draft is valid", async () => {
    mockApiFetch
      .mockResolvedValueOnce(DRAFT_RESPONSE)
      .mockResolvedValueOnce(VALIDATE_RESPONSE_CLEAN);

    const onValidationErrors = vi.fn();

    const { result } = renderHook(() =>
      useStrategyDraft({ strategyId: STRATEGY_ID, onValidationErrors })
    );

    await act(async () => {
      await result.current.persistDraft(NODES, EDGES);
    });

    expect(onValidationErrors).toHaveBeenCalledWith([]);
  });

  it("does not throw when onValidationErrors is not provided", async () => {
    mockApiFetch
      .mockResolvedValueOnce(DRAFT_RESPONSE)
      .mockResolvedValueOnce(VALIDATE_RESPONSE_ERRORS);

    const { result } = renderHook(() =>
      useStrategyDraft({ strategyId: STRATEGY_ID })
      // No onValidationErrors callback
    );

    await expect(
      act(async () => {
        await result.current.persistDraft(NODES, EDGES);
      })
    ).resolves.not.toThrow();
  });
});
