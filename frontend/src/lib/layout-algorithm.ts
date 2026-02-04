import type { Node, Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";

export type LayoutDirection = "LR" | "TB";
type ElkDirection = "RIGHT" | "DOWN";

interface LayoutConfig {
  direction: LayoutDirection;
  nodeSpacing: number;
  layerSpacing: number;
  nodePadding: number;
  gridSnap: number;
}

const elk = new ELK();

/**
 * Auto-arrange nodes in a clean left-to-right or top-to-bottom layout
 */
export async function autoArrangeLayout(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = "LR"
): Promise<Map<string, { x: number; y: number }>> {
  // Edge case: empty canvas
  if (nodes.length === 0) {
    return new Map();
  }

  // Edge case: single node
  if (nodes.length === 1) {
    return new Map([[nodes[0].id, snapToGrid({ x: 100, y: 100 }, 15)]]);
  }

  const config: LayoutConfig = {
    direction,
    nodeSpacing: 60,
    layerSpacing: 200,
    nodePadding: 30,
    gridSnap: 15,
  };

  const layout = await elk.layout(buildElkGraph(nodes, edges, config));
  return mapElkPositions(layout, config);
}

function buildElkGraph(
  nodes: Node[],
  edges: Edge[],
  config: LayoutConfig
): {
  id: string;
  layoutOptions: Record<string, string>;
  children: Array<{ id: string; width: number; height: number }>;
  edges: Array<{ id: string; sources: string[]; targets: string[] }>;
} {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const filteredEdges = edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );

  return {
    id: "strategy",
    layoutOptions: {
      "elk.algorithm": "org.eclipse.elk.mrtree",
      // ELK expects cardinal directions, not Dagre-style LR/TB shorthands.
      "elk.direction": toElkDirection(config.direction),
      "elk.spacing.nodeNode": String(config.nodeSpacing),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(
        config.layerSpacing
      ),
      "elk.spacing.nodeNodeBetweenLayers": String(config.layerSpacing),
      "elk.spacing.edgeNode": String(config.nodePadding),
      "elk.edgeRouting": "ORTHOGONAL",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: getNodeWidth(node),
      height: getNodeHeight(node),
    })),
    edges: filteredEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };
}

function toElkDirection(direction: LayoutDirection): ElkDirection {
  return direction === "TB" ? "DOWN" : "RIGHT";
}

function mapElkPositions(
  layout: {
    children?: Array<{ id: string; x?: number; y?: number }>;
  },
  config: LayoutConfig
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  for (const child of layout.children ?? []) {
    if (child.x === undefined || child.y === undefined) continue;
    positions.set(
      child.id,
      snapToGrid({ x: child.x, y: child.y }, config.gridSnap)
    );
  }

  return positions;
}


/**
 * Estimate node height from React Flow data
 */
function getNodeHeight(node?: Node): number {
  const MIN_NODE_HEIGHT = 60;
  if (!node) return MIN_NODE_HEIGHT;
  const height = node.height ?? node.measured?.height ?? MIN_NODE_HEIGHT;
  return Math.max(height, MIN_NODE_HEIGHT);
}

function getNodeWidth(node?: Node): number {
  const MIN_NODE_WIDTH = 160;
  if (!node) return MIN_NODE_WIDTH;
  const width = node.width ?? node.measured?.width ?? MIN_NODE_WIDTH;
  return Math.max(width, MIN_NODE_WIDTH);
}


/**
 * Snap position to grid
 */
function snapToGrid(
  position: { x: number; y: number },
  gridSize: number
): { x: number; y: number } {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}
