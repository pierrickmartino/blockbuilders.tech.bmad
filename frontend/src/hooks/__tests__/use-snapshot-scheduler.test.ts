import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Dispatch, SetStateAction } from "react";
import { useSnapshotScheduler } from "../use-snapshot-scheduler";
import type { HistoryState } from "@/lib/history-manager";
import type { Node, Edge } from "@xyflow/react";

function makeNode(id: string): Node {
  return { id, position: { x: 0, y: 0 }, data: {} };
}

describe("useSnapshotScheduler", () => {
  let setHistoryMock: ReturnType<typeof vi.fn>;
  let triggerAutosaveMock: ReturnType<typeof vi.fn>;
  let isApplyingHistoryRef: { current: boolean };

  // Typed aliases for passing to the hook
  let setHistory: Dispatch<SetStateAction<HistoryState>>;
  let triggerAutosave: (nodes: Node[], edges: Edge[]) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    setHistoryMock = vi.fn();
    triggerAutosaveMock = vi.fn();
    setHistory = setHistoryMock as unknown as Dispatch<SetStateAction<HistoryState>>;
    triggerAutosave = triggerAutosaveMock as unknown as (nodes: Node[], edges: Edge[]) => void;
    isApplyingHistoryRef = { current: false };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("flushSnapshot", () => {
    it("is a no-op when no snapshot timer is pending", () => {
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      act(() => {
        result.current.flushSnapshot();
      });
      expect(setHistoryMock).not.toHaveBeenCalled();
    });

    it("drains pending timer and calls setHistory synchronously", () => {
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      const nodes = [makeNode("a")];
      const edges: Edge[] = [];

      act(() => {
        result.current.scheduleSnapshot(nodes, edges);
      });
      expect(setHistoryMock).not.toHaveBeenCalled();

      act(() => {
        result.current.flushSnapshot();
      });
      expect(setHistoryMock).toHaveBeenCalledTimes(1);
    });

    it("is idempotent - second call after flush is a no-op", () => {
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      act(() => {
        result.current.scheduleSnapshot([makeNode("a")], []);
        result.current.flushSnapshot();
        result.current.flushSnapshot();
      });
      expect(setHistoryMock).toHaveBeenCalledTimes(1);
    });

    it("prevents the debounced timer from firing again after flush", () => {
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      act(() => {
        result.current.scheduleSnapshot([makeNode("a")], []);
        result.current.flushSnapshot();
      });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(setHistoryMock).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when guard is active (isApplyingHistoryRef=true)", () => {
      isApplyingHistoryRef.current = true;
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      // Guard blocks scheduleSnapshot too, so there is no pending timer to flush
      act(() => {
        result.current.flushSnapshot();
      });
      expect(setHistoryMock).not.toHaveBeenCalled();
    });
  });

  describe("commitSnapshot", () => {
    it("pushes immediately without waiting for debounce", () => {
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      act(() => {
        result.current.commitSnapshot([makeNode("a")], []);
      });
      expect(setHistoryMock).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when isApplyingHistoryRef is true", () => {
      isApplyingHistoryRef.current = true;
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      act(() => {
        result.current.commitSnapshot([makeNode("a")], []);
      });
      expect(setHistoryMock).not.toHaveBeenCalled();
    });
  });

  describe("integration: flush + commit pattern", () => {
    it("typing-then-arrange within 500ms produces two setHistory calls", () => {
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      const typingNodes = [makeNode("a")];
      const arrangedNodes = [{ ...makeNode("a"), position: { x: 100, y: 200 } }];
      const edges: Edge[] = [];

      act(() => {
        result.current.scheduleSnapshot(typingNodes, edges);
      });
      // Within 500ms debounce window, user clicks auto-arrange
      act(() => {
        result.current.flushSnapshot();
        result.current.commitSnapshot(arrangedNodes, edges);
      });

      expect(setHistoryMock).toHaveBeenCalledTimes(2);
    });

    it("arrange with no pending edit produces exactly one setHistory call", () => {
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      const arrangedNodes = [makeNode("a")];
      const edges: Edge[] = [];

      act(() => {
        result.current.flushSnapshot();
        result.current.commitSnapshot(arrangedNodes, edges);
      });

      expect(setHistoryMock).toHaveBeenCalledTimes(1);
    });

    it("flush and commit produce distinct updater calls", () => {
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      const typingNodes = [makeNode("typing")];
      const arrangedNodes = [makeNode("arranged")];
      const edges: Edge[] = [];

      act(() => {
        result.current.scheduleSnapshot(typingNodes, edges);
      });
      act(() => {
        result.current.flushSnapshot();
        result.current.commitSnapshot(arrangedNodes, edges);
      });

      expect(setHistoryMock).toHaveBeenCalledTimes(2);
      // The two updater functions must be different closures (capture different node arrays)
      expect(setHistoryMock.mock.calls[0][0]).not.toBe(setHistoryMock.mock.calls[1][0]);
    });
  });

  describe("scheduleSnapshot", () => {
    it("pushes snapshot after 500ms debounce", () => {
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      act(() => {
        result.current.scheduleSnapshot([makeNode("a")], []);
      });
      expect(setHistoryMock).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(setHistoryMock).toHaveBeenCalledTimes(1);
    });

    it("resets debounce on rapid successive calls", () => {
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      act(() => {
        result.current.scheduleSnapshot([makeNode("a")], []);
      });
      act(() => {
        vi.advanceTimersByTime(300);
        result.current.scheduleSnapshot([makeNode("b")], []);
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(setHistoryMock).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(setHistoryMock).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when isApplyingHistoryRef is true", () => {
      isApplyingHistoryRef.current = true;
      const { result } = renderHook(() =>
        useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave)
      );
      act(() => {
        result.current.scheduleSnapshot([makeNode("a")], []);
      });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(setHistoryMock).not.toHaveBeenCalled();
    });
  });
});
