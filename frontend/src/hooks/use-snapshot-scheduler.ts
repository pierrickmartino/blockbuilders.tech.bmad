import { useRef, useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { pushSnapshot, type HistoryState } from "@/lib/history-manager";

export function useSnapshotScheduler(
  isApplyingHistoryRef: React.MutableRefObject<boolean>,
  setHistory: React.Dispatch<React.SetStateAction<HistoryState>>,
  triggerAutosave: (nodes: Node[], edges: Edge[]) => void
) {
  const snapshotTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Stores the in-flight state so flushSnapshot can push it synchronously
  const pendingSnapshotRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const scheduleSnapshot = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      if (isApplyingHistoryRef.current) return;

      if (snapshotTimerRef.current) {
        clearTimeout(snapshotTimerRef.current);
        snapshotTimerRef.current = null;
      }
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      pendingSnapshotRef.current = { nodes: newNodes, edges: newEdges };

      snapshotTimerRef.current = setTimeout(() => {
        snapshotTimerRef.current = null;
        pendingSnapshotRef.current = null;
        if (isApplyingHistoryRef.current) return;
        setHistory((h) => pushSnapshot(h, newNodes, newEdges));
      }, 500);

      autosaveTimerRef.current = setTimeout(() => {
        autosaveTimerRef.current = null;
        if (isApplyingHistoryRef.current) return;
        triggerAutosave(newNodes, newEdges);
      }, 10000);
    },
    [isApplyingHistoryRef, setHistory, triggerAutosave]
  );

  // Drain any pending debounced snapshot synchronously. Idempotent — no-op if no timer pending.
  const flushSnapshot = useCallback(() => {
    if (!snapshotTimerRef.current || !pendingSnapshotRef.current) return;

    clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = null;

    const { nodes, edges } = pendingSnapshotRef.current;
    pendingSnapshotRef.current = null;

    if (isApplyingHistoryRef.current) return;
    setHistory((h) => pushSnapshot(h, nodes, edges));
  }, [isApplyingHistoryRef, setHistory]);

  // Push a snapshot immediately, bypassing the debounce path entirely.
  const commitSnapshot = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      if (isApplyingHistoryRef.current) return;
      setHistory((h) => pushSnapshot(h, nodes, edges));
    },
    [isApplyingHistoryRef, setHistory]
  );

  return {
    scheduleSnapshot,
    flushSnapshot,
    commitSnapshot,
    snapshotTimerRef,
    autosaveTimerRef,
  };
}
