import type { Node, Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";

const MIN_NODE_WIDTH = 160;
const MIN_NODE_HEIGHT = 60;
const GRID_SNAP = 15;

const elk = new ELK();

/**
 * Arrange non-note nodes left-to-right using ELK layered algorithm.
 * Note nodes are excluded from the returned map; callers preserve their
 * positions via `newPositions.get(id) || node.position`.
 */
export async function arrangeNodes(
  nodes: Node[],
  edges: Edge[],
  dimensions: Map<string, { width: number; height: number }>
): Promise<Map<string, { x: number; y: number }>> {
  const contentNodes = nodes.filter((n) => n.type !== "note");

  if (contentNodes.length === 0) return new Map();

  if (contentNodes.length === 1) {
    return new Map([[contentNodes[0].id, snapToGrid({ x: 100, y: 100 })]]);
  }

  const contentIds = new Set(contentNodes.map((n) => n.id));
  const contentEdges = edges.filter(
    (e) => contentIds.has(e.source) && contentIds.has(e.target)
  );

  const graph = {
    id: "strategy",
    layoutOptions: {
      "elk.algorithm": "org.eclipse.elk.layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.spacing.edgeNode": "30",
      "elk.edgeRouting": "ORTHOGONAL",
    },
    children: contentNodes.map((node) => {
      const dim = dimensions.get(node.id);
      return {
        id: node.id,
        width: dim ? Math.max(dim.width, MIN_NODE_WIDTH) : MIN_NODE_WIDTH,
        height: dim ? Math.max(dim.height, MIN_NODE_HEIGHT) : MIN_NODE_HEIGHT,
      };
    }),
    edges: contentEdges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layout = await elk.layout(graph);
  return extractPositions(layout);
}

function extractPositions(layout: {
  children?: Array<{ id: string; x?: number; y?: number }>;
}): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  for (const child of layout.children ?? []) {
    if (child.x === undefined || child.y === undefined) continue;
    positions.set(child.id, snapToGrid({ x: child.x, y: child.y }));
  }
  return positions;
}

function snapToGrid(position: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.round(position.x / GRID_SNAP) * GRID_SNAP,
    y: Math.round(position.y / GRID_SNAP) * GRID_SNAP,
  };
}
