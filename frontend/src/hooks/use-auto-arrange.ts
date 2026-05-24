import { useState, useCallback } from "react";
import type { Dispatch, SetStateAction, RefObject } from "react";
import type { Node, Edge, ReactFlowInstance } from "@xyflow/react";

type AnyFlowInstance = Pick<ReactFlowInstance, "getInternalNode" | "fitView">;
import { useNodesInitialized } from "@xyflow/react";
import { arrangeNodes } from "@/lib/layout-algorithm";
import {
  applyArrangeTransition,
  ARRANGE_TRANSITION_DURATION,
} from "@/lib/arrange-transition";
import { trackEvent } from "@/lib/analytics";

interface UseAutoArrangeOptions {
  nodes: Node[];
  edges: Edge[];
  strategyId: string;
  userId?: string;
  reactFlowRef: RefObject<AnyFlowInstance | null>;
  canvasContainerRef: RefObject<HTMLElement | null>;
  flushSnapshot: () => void;
  commitSnapshot: (nodes: Node[], edges: Edge[]) => void;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setShowLayoutMenu: (open: boolean) => void;
}

interface UseAutoArrangeReturn {
  isArranging: boolean;
  isDisabled: boolean;
  handleAutoArrange: () => Promise<void>;
}

export function useAutoArrange({
  nodes,
  edges,
  strategyId,
  userId,
  reactFlowRef,
  canvasContainerRef,
  flushSnapshot,
  commitSnapshot,
  setNodes,
  setShowLayoutMenu,
}: UseAutoArrangeOptions): UseAutoArrangeReturn {
  const [isArranging, setIsArranging] = useState(false);
  const nodesInitialized = useNodesInitialized();

  const handleAutoArrange = useCallback(async () => {
    setIsArranging(true);
    const startTime = Date.now();
    try {
      const dims = new Map<string, { width: number; height: number }>();
      for (const node of nodes) {
        const internal = reactFlowRef.current?.getInternalNode(node.id);
        const measured = internal?.measured;
        if (measured?.width && measured?.height) {
          dims.set(node.id, { width: measured.width, height: measured.height });
        }
      }

      const newPositions = await arrangeNodes(nodes, edges, dims);
      const updatedNodes = nodes.map((node) => ({
        ...node,
        position: newPositions.get(node.id) ?? node.position,
      }));

      flushSnapshot();
      commitSnapshot(updatedNodes, edges);

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      applyArrangeTransition(canvasContainerRef.current, prefersReducedMotion);
      setNodes(updatedNodes);

      await new Promise<void>((resolve) =>
        setTimeout(resolve, ARRANGE_TRANSITION_DURATION)
      );

      reactFlowRef.current?.fitView({
        padding: 0.2,
        duration: prefersReducedMotion ? 0 : 300,
      });
      setShowLayoutMenu(false);

      trackEvent(
        "canvas_auto_arrange_clicked",
        {
          strategy_id: strategyId,
          node_count: nodes.length,
          edge_count: edges.length,
          duration_ms: Date.now() - startTime,
          was_animation_skipped: prefersReducedMotion,
        },
        userId
      );
    } finally {
      setIsArranging(false);
    }
  }, [
    nodes,
    edges,
    strategyId,
    userId,
    reactFlowRef,
    canvasContainerRef,
    flushSnapshot,
    commitSnapshot,
    setNodes,
    setShowLayoutMenu,
  ]);

  return {
    isArranging,
    isDisabled: !nodesInitialized,
    handleAutoArrange,
  };
}
