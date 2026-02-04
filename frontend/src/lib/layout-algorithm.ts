import type { Node, Edge } from "@xyflow/react";

export type LayoutDirection = "LR" | "TB";

interface LayoutConfig {
  direction: LayoutDirection;
  nodeSpacing: number;
  layerSpacing: number;
  nodePadding: number;
  gridSnap: number;
  isolatedNodeSpacing: number;
}

/**
 * Auto-arrange nodes in a clean left-to-right or top-to-bottom layout
 */
export function autoArrangeLayout(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = "LR"
): Map<string, { x: number; y: number }> {
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
    nodeSpacing: 80,
    layerSpacing: 250,
    nodePadding: 40,
    gridSnap: 15,
    isolatedNodeSpacing: 40,
  };

  // Build adjacency lists
  const edgeMap = buildEdgeMap(nodes, edges);

  // Identify independent branches (paths to terminals)
  const branches = identifyBranches(nodes, edgeMap);

  // Layout each branch separately
  const positions = layoutBranches(branches, nodes, edgeMap, config);

  // Handle isolated nodes
  const allBranchNodes = new Set(
    branches.flatMap((b) => b.nodes.map((n) => n.id))
  );
  const isolated = nodes.filter((n) => !allBranchNodes.has(n.id));

  if (isolated.length > 0) {
    const isolatedPositions = layoutIsolatedNodes(
      isolated,
      positions,
      config
    );
    for (const [id, pos] of isolatedPositions) {
      positions.set(id, pos);
    }
  }

  return positions;
}

interface Branch {
  terminal: Node;
  nodes: Node[];
  layers: Map<string, number>; // node ID -> layer depth
}

/**
 * Build edge maps for quick lookup
 */
function buildEdgeMap(
  nodes: Node[],
  edges: Edge[]
): {
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
} {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      outgoing.get(edge.source)?.push(edge.target);
      incoming.get(edge.target)?.push(edge.source);
    }
  }

  return { outgoing, incoming };
}

/**
 * Identify independent branches by tracing backward from terminal nodes
 */
function identifyBranches(
  nodes: Node[],
  edgeMap: {
    outgoing: Map<string, string[]>;
    incoming: Map<string, string[]>;
  }
): Branch[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Find terminal nodes (entry_signal, exit_signal, or nodes with no outgoing edges)
  const terminals = nodes.filter((node) => {
    const isSignal =
      node.type === "entry_signal" || node.type === "exit_signal";
    const hasOutgoing = (edgeMap.outgoing.get(node.id)?.length ?? 0) > 0;
    return isSignal || !hasOutgoing;
  });

  // For each terminal, trace backward to find its branch
  const branches: Branch[] = [];
  const claimed = new Set<string>();

  for (const terminal of terminals) {
    const branchNodes = new Set<string>();
    const layers = new Map<string, number>();
    const queue: Array<{ id: string; depth: number }> = [
      { id: terminal.id, depth: 0 },
    ];

    branchNodes.add(terminal.id);
    layers.set(terminal.id, 0);

    // BFS backward through incoming edges
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      const parents = edgeMap.incoming.get(id) ?? [];

      for (const parentId of parents) {
        if (!branchNodes.has(parentId)) {
          branchNodes.add(parentId);
          layers.set(parentId, depth + 1);
          queue.push({ id: parentId, depth: depth + 1 });
        }
      }
    }

    // Convert to node objects
    const branchNodeList: Node[] = [];
    for (const nodeId of branchNodes) {
      const node = nodeById.get(nodeId);
      if (node) {
        branchNodeList.push(node);
        claimed.add(nodeId);
      }
    }

    if (branchNodeList.length > 0) {
      branches.push({
        terminal,
        nodes: branchNodeList,
        layers,
      });
    }
  }

  return branches;
}

/**
 * Layout branches in separate vertical zones
 */
function layoutBranches(
  branches: Branch[],
  allNodes: Node[],
  edgeMap: {
    outgoing: Map<string, string[]>;
    incoming: Map<string, string[]>;
  },
  config: LayoutConfig
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  let currentYOffset = 0;

  for (const branch of branches) {
    // Find max depth (layer)
    const maxDepth = Math.max(...Array.from(branch.layers.values()));

    // Invert layers (so sources are at layer 0, terminals at max)
    const invertedLayers = new Map<string, number>();
    for (const [nodeId, depth] of branch.layers) {
      invertedLayers.set(nodeId, maxDepth - depth);
    }

    // Group nodes by layer
    const layerGroups = new Map<number, string[]>();
    for (const [nodeId, layer] of invertedLayers) {
      if (!layerGroups.has(layer)) {
        layerGroups.set(layer, []);
      }
      layerGroups.get(layer)!.push(nodeId);
    }

    // Sort layers and layout left-to-right
    const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);

    let maxBranchHeight = 0;

    for (const layer of sortedLayers) {
      const layerNodes = layerGroups.get(layer) ?? [];

      // Sort nodes within layer by their connections
      const sortedLayerNodes = sortNodesInLayer(
        layerNodes,
        invertedLayers,
        edgeMap
      );

      for (let i = 0; i < sortedLayerNodes.length; i++) {
        const nodeId = sortedLayerNodes[i];
        const node = allNodes.find((n) => n.id === nodeId);
        if (!node) continue;

        const nodeHeight = getNodeHeight(node);
        const yPos = currentYOffset + i * config.nodeSpacing;
        const xPos = layer * config.layerSpacing;

        positions.set(
          nodeId,
          snapToGrid({ x: xPos, y: yPos }, config.gridSnap)
        );

        maxBranchHeight = Math.max(maxBranchHeight, yPos + nodeHeight);
      }
    }

    // Add spacing between branches
    currentYOffset = maxBranchHeight + config.nodeSpacing * 0.8;
  }

  return positions;
}

/**
 * Sort nodes within a layer to minimize crossings
 */
function sortNodesInLayer(
  nodeIds: string[],
  layers: Map<string, number>,
  edgeMap: {
    outgoing: Map<string, string[]>;
    incoming: Map<string, string[]>;
  }
): string[] {
  // Sort by average position of parents (if any)
  return [...nodeIds].sort((a, b) => {
    const aParents = edgeMap.incoming.get(a) ?? [];
    const bParents = edgeMap.incoming.get(b) ?? [];

    if (aParents.length === 0 && bParents.length === 0) return 0;
    if (aParents.length === 0) return -1;
    if (bParents.length === 0) return 1;

    const aAvg =
      aParents.reduce((sum, p) => sum + (layers.get(p) ?? 0), 0) /
      aParents.length;
    const bAvg =
      bParents.reduce((sum, p) => sum + (layers.get(p) ?? 0), 0) /
      bParents.length;

    return aAvg - bAvg;
  });
}

/**
 * Layout isolated nodes (not in any branch)
 */
function layoutIsolatedNodes(
  isolated: Node[],
  existingPositions: Map<string, { x: number; y: number }>,
  config: LayoutConfig
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Find max Y position from existing nodes
  let maxY = 0;
  for (const pos of existingPositions.values()) {
    maxY = Math.max(maxY, pos.y);
  }

  // Place isolated nodes in a row below
  const startY = maxY + config.nodeSpacing * 3;

  for (let i = 0; i < isolated.length; i++) {
    const position = {
      x: i * (config.nodeSpacing + 100),
      y: startY,
    };
    positions.set(isolated[i].id, snapToGrid(position, config.gridSnap));
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
