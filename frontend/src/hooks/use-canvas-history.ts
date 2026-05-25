import { useCallback, useEffect, useRef, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import {
  resetHistory,
  pushSnapshot,
  undo as historyUndo,
  redo as historyRedo,
  canUndo as historyCanUndo,
  canRedo as historyCanRedo,
  type HistoryState,
} from "@/lib/history-manager";

interface UseCanvasHistoryOptions {
  onStable?: (nodes: Node[], edges: Edge[]) => void;
  snapshotDebounceMs?: number;
  stableDelayMs?: number;
}

interface CanvasSnapshot {
  nodes: Node[];
  edges: Edge[];
}

export function useCanvasHistory(options: UseCanvasHistoryOptions = {}) {
  const {
    onStable,
    snapshotDebounceMs = 500,
    stableDelayMs = 10_000,
  } = options;

  const [history, setHistory] = useState<HistoryState>(() => resetHistory([], []));
  const isApplyingRef = useRef(false);

  const snapshotTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stableTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRef = useRef<CanvasSnapshot | null>(null);

  const onStableRef = useRef(onStable);
  useEffect(() => {
    onStableRef.current = onStable;
  }, [onStable]);

  const clearTimers = useCallback(() => {
    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
    if (stableTimerRef.current) {
      clearTimeout(stableTimerRef.current);
      stableTimerRef.current = null;
    }
  }, []);

  const scheduleSnapshot = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      if (isApplyingRef.current) return;

      clearTimers();
      pendingRef.current = { nodes, edges };

      snapshotTimerRef.current = setTimeout(() => {
        snapshotTimerRef.current = null;
        pendingRef.current = null;
        if (isApplyingRef.current) return;
        setHistory((h) => pushSnapshot(h, nodes, edges));
      }, snapshotDebounceMs);

      stableTimerRef.current = setTimeout(() => {
        stableTimerRef.current = null;
        if (isApplyingRef.current) return;
        onStableRef.current?.(nodes, edges);
      }, stableDelayMs);
    },
    [clearTimers, snapshotDebounceMs, stableDelayMs]
  );

  const flushSnapshot = useCallback(() => {
    if (!snapshotTimerRef.current || !pendingRef.current) return;

    clearTimers();

    const { nodes, edges } = pendingRef.current;
    pendingRef.current = null;

    if (isApplyingRef.current) return;
    setHistory((h) => pushSnapshot(h, nodes, edges));
  }, [clearTimers]);

  const commitSnapshot = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      if (isApplyingRef.current) return;
      setHistory((h) => pushSnapshot(h, nodes, edges));

      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
      }
      stableTimerRef.current = setTimeout(() => {
        stableTimerRef.current = null;
        if (isApplyingRef.current) return;
        onStableRef.current?.(nodes, edges);
      }, stableDelayMs);
    },
    [stableDelayMs]
  );

  const undo = useCallback((): CanvasSnapshot | null => {
    if (!historyCanUndo(history)) return null;

    clearTimers();

    const { history: newHistory, snapshot } = historyUndo(history);
    if (!snapshot) return null;

    isApplyingRef.current = true;
    setHistory(newHistory);
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 0);

    return { nodes: snapshot.nodes, edges: snapshot.edges };
  }, [history, clearTimers]);

  const redo = useCallback((): CanvasSnapshot | null => {
    if (!historyCanRedo(history)) return null;

    clearTimers();

    const { history: newHistory, snapshot } = historyRedo(history);
    if (!snapshot) return null;

    isApplyingRef.current = true;
    setHistory(newHistory);
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 0);

    return { nodes: snapshot.nodes, edges: snapshot.edges };
  }, [history, clearTimers]);

  const reset = useCallback((nodes: Node[], edges: Edge[]) => {
    clearTimers();
    pendingRef.current = null;
    setHistory(resetHistory(nodes, edges));
  }, [clearTimers]);

  return {
    canUndo: historyCanUndo(history),
    canRedo: historyCanRedo(history),
    scheduleSnapshot,
    flushSnapshot,
    commitSnapshot,
    undo,
    redo,
    reset,
    stableTimerRef,
  };
}
