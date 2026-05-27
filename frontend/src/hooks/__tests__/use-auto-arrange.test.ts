import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import { useAutoArrange } from "../use-auto-arrange";
import { arrangeNodes } from "@/lib/layout-algorithm";
import { applyArrangeTransition } from "@/lib/arrange-transition";
import { trackEvent } from "@/lib/analytics";

vi.mock("@xyflow/react", () => ({
  useNodesInitialized: vi.fn(() => true),
}));

vi.mock("@/lib/layout-algorithm", () => ({
  arrangeNodes: vi.fn(),
}));

vi.mock("@/lib/arrange-transition", () => ({
  applyArrangeTransition: vi.fn(),
  ARRANGE_TRANSITION_DURATION: 320,
  ARRANGE_TRANSITION_CLASS: "canvas-arranging",
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

function makeNode(id: string, type?: string): Node {
  return { id, type, position: { x: 0, y: 0 }, data: {} };
}

function makeFlowInstance(measuredOverride?: { width: number; height: number }) {
  return {
    getInternalNode: vi.fn(() => ({
      measured: measuredOverride ?? { width: 120, height: 60 },
    })),
    fitView: vi.fn(),
  };
}

describe("useAutoArrange", () => {
  let flushSnapshot: () => void;
  let commitSnapshot: (nodes: Node[], edges: Edge[]) => void;
  let onNodesChange: (nodes: Node[]) => void;
  let setShowLayoutMenu: (open: boolean) => void;
  let mockFlowInstance: ReturnType<typeof makeFlowInstance>;
  let canvasContainerRef: { current: HTMLElement | null };

  beforeEach(() => {
    flushSnapshot = vi.fn() as unknown as () => void;
    commitSnapshot = vi.fn() as unknown as (nodes: Node[], edges: Edge[]) => void;
    onNodesChange = vi.fn() as unknown as (nodes: Node[]) => void;
    setShowLayoutMenu = vi.fn() as unknown as (open: boolean) => void;
    mockFlowInstance = makeFlowInstance();
    canvasContainerRef = { current: document.createElement("div") };

    vi.mocked(arrangeNodes).mockResolvedValue(
      new Map([["a", { x: 100, y: 200 }]])
    );

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  function renderArrangeHook(options: {
    nodes?: Node[];
    edges?: Edge[];
    strategyId?: string;
  } = {}) {
    const nodes = options.nodes ?? [makeNode("a")];
    const edges = options.edges ?? [];
    const strategyId = options.strategyId ?? "strat-1";

    return renderHook(() =>
      useAutoArrange({
        nodes,
        edges,
        strategyId,
        reactFlowRef: { current: mockFlowInstance as never },
        canvasContainerRef,
        flushSnapshot,
        commitSnapshot,
        onNodesChange,
        setShowLayoutMenu,
      })
    );
  }

  it("single click with no pending edit pushes exactly one history entry", async () => {
    // flushSnapshot is a no-op (no pending snapshot): only commitSnapshot contributes
    const { result } = renderArrangeHook();

    await act(async () => {
      await result.current.handleAutoArrange();
    });

    expect(flushSnapshot).toHaveBeenCalledTimes(1);
    expect(commitSnapshot).toHaveBeenCalledTimes(1);
    // flushSnapshot was a no-op, so only commitSnapshot pushed a history entry → 1 total
  });

  it("typing-then-arrange within 500ms produces two recoverable history entries", async () => {
    let historyPushCount = 0;
    // flushWithPending simulates a pending typing snapshot that gets flushed
    const flushWithPending = vi.fn(() => {
      historyPushCount++;
    }) as unknown as () => void;
    const commitWithPush = vi.fn(() => {
      historyPushCount++;
    }) as unknown as (nodes: Node[], edges: Edge[]) => void;

    const { result } = renderHook(() =>
      useAutoArrange({
        nodes: [makeNode("a")],
        edges: [],
        strategyId: "strat-1",
        reactFlowRef: { current: mockFlowInstance as never },
        canvasContainerRef,
        flushSnapshot: flushWithPending,
        commitSnapshot: commitWithPush,
        onNodesChange,
        setShowLayoutMenu,
      })
    );

    await act(async () => {
      await result.current.handleAutoArrange();
    });

    expect(historyPushCount).toBe(2);
    expect(vi.mocked(flushWithPending)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(commitWithPush)).toHaveBeenCalledTimes(1);
  });

  it("applies transition class during arrange window and clears isArranging after 320ms", async () => {
    vi.useFakeTimers();
    vi.mocked(arrangeNodes).mockResolvedValue(new Map([["a", { x: 100, y: 200 }]]));

    const { result } = renderArrangeHook();

    expect(result.current.isArranging).toBe(false);

    await act(async () => {
      const promise = result.current.handleAutoArrange();
      await vi.runAllTimersAsync();
      await promise;
    });

    expect(vi.mocked(applyArrangeTransition)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(applyArrangeTransition)).toHaveBeenCalledWith(
      canvasContainerRef.current,
      expect.any(Boolean)
    );
    expect(result.current.isArranging).toBe(false);
  });

  it("note nodes retain pre-click positions after arrange", async () => {
    const noteNode = makeNode("note-1", "note");
    noteNode.position = { x: 42, y: 99 };
    const regularNode = makeNode("reg-1");

    // arrangeNodes returns position only for the regular node, not the note
    vi.mocked(arrangeNodes).mockResolvedValue(
      new Map([["reg-1", { x: 300, y: 400 }]])
    );

    const { result } = renderHook(() =>
      useAutoArrange({
        nodes: [noteNode, regularNode],
        edges: [],
        strategyId: "strat-1",
        reactFlowRef: { current: mockFlowInstance as never },
        canvasContainerRef,
        flushSnapshot,
        commitSnapshot,
        onNodesChange,
        setShowLayoutMenu,
      })
    );

    await act(async () => {
      await result.current.handleAutoArrange();
    });

    expect(onNodesChange).toHaveBeenCalledTimes(1);
    expect(onNodesChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "note-1", position: { x: 42, y: 99 } }),
        expect.objectContaining({ id: "reg-1", position: { x: 300, y: 400 } }),
      ])
    );
  });

  it("dispatches canvas_auto_arrange_clicked telemetry on click", async () => {
    const { result } = renderArrangeHook({
      nodes: [makeNode("a"), makeNode("b")],
      edges: [],
      strategyId: "my-strat",
    });

    await act(async () => {
      await result.current.handleAutoArrange();
    });

    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith(
      "canvas_auto_arrange_clicked",
      expect.objectContaining({
        strategy_id: "my-strat",
        node_count: 2,
        edge_count: 0,
        duration_ms: expect.any(Number),
        was_animation_skipped: expect.any(Boolean),
      }),
      undefined
    );
  });

  it("exposes isDisabled reflecting useNodesInitialized", async () => {
    const { useNodesInitialized } = await import("@xyflow/react");
    vi.mocked(useNodesInitialized).mockReturnValue(false);

    const { result } = renderArrangeHook();
    expect(result.current.isDisabled).toBe(true);

    vi.mocked(useNodesInitialized).mockReturnValue(true);
  });
});
