import type { Node, Edge } from "@xyflow/react";

export type LayoutDirection = "LR" | "TB";

interface LayoutConfig {
  direction: LayoutDirection;
  nodeSpacing: number;
  layerSpacing: number;
  gridSnap: number;
  isolatedNodeSpacing: number;
}

interface GraphAnalysis {
  layers: string[][];
  isolated: string[];
  hasCycles: boolean;
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
    nodeSpacing: 60,
    layerSpacing: 200,
    gridSnap: 15,
    isolatedNodeSpacing: 40,
  };

  // Analyze graph structure
  const analysis = analyzeGraph(nodes, edges);

  // Calculate positions for layered nodes
  const positions = calculateLayeredPositions(
    analysis.layers,
    nodes,
    config
  );

  // Calculate positions for isolated nodes
  const isolatedPositions = calculateIsolatedPositions(
    analysis.isolated,
    nodes,
    analysis.layers,
    config
  );

  // Merge and return all positions
  return new Map([...positions, ...isolatedPositions]);
}

/**
 * Analyze graph structure: find layers, isolated nodes, detect cycles
 */
function analyzeGraph(nodes: Node[], edges: Edge[]): GraphAnalysis {
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Build adjacency lists
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of edges) {
    const source = edge.source;
    const target = edge.target;

    if (nodeIds.has(source) && nodeIds.has(target)) {
      outgoing.get(source)?.push(target);
      incoming.get(target)?.push(source);
    }
  }

  // Find isolated nodes (no connections)
  const isolated: string[] = [];
  for (const node of nodes) {
    const hasOut = (outgoing.get(node.id)?.length ?? 0) > 0;
    const hasIn = (incoming.get(node.id)?.length ?? 0) > 0;
    if (!hasOut && !hasIn) {
      isolated.push(node.id);
    }
  }

  // Try topological sort
  const connectedNodes = nodes.filter((n) => !isolated.includes(n.id));
  const topoResult = topologicalSort(connectedNodes, outgoing, incoming);

  let layers: string[][];
  let hasCycles = false;

  if (topoResult.sorted) {
    // Acyclic: assign layers by longest path from sources
    layers = assignLayersByTopologicalOrder(
      topoResult.sorted,
      incoming
    );
  } else {
    // Cyclic: fallback to depth-based BFS layering
    hasCycles = true;
    layers = assignLayersByDepth(connectedNodes, outgoing, incoming);
  }

  return { layers, isolated, hasCycles };
}

/**
 * Topological sort using Kahn's algorithm
 * Returns sorted list if acyclic, null if cycles detected
 */
function topologicalSort(
  nodes: Node[],
  outgoing: Map<string, string[]>,
  incoming: Map<string, string[]>
): { sorted: string[] | null; hasCycles: boolean } {
  const inDegree = new Map<string, number>();
  const queue: string[] = [];

  // Initialize in-degrees
  for (const node of nodes) {
    const degree = incoming.get(node.id)?.length ?? 0;
    inDegree.set(node.id, degree);
    if (degree === 0) {
      queue.push(node.id);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of outgoing.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  const hasCycles = sorted.length !== nodes.length;
  return { sorted: hasCycles ? null : sorted, hasCycles };
}

/**
 * Assign layers by topological order (for acyclic graphs)
 */
function assignLayersByTopologicalOrder(
  sorted: string[],
  incoming: Map<string, string[]>
): string[][] {
  const layerMap = new Map<string, number>();

  // Assign each node to the maximum layer of its predecessors + 1
  for (const nodeId of sorted) {
    const predecessors = incoming.get(nodeId) ?? [];
    const maxPredLayer = predecessors.reduce(
      (max, pred) => Math.max(max, layerMap.get(pred) ?? -1),
      -1
    );
    layerMap.set(nodeId, maxPredLayer + 1);
  }

  // Group nodes by layer
  const maxLayer = Math.max(...Array.from(layerMap.values()), 0);
  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);

  for (const [nodeId, layer] of layerMap) {
    layers[layer].push(nodeId);
  }

  return layers;
}

/**
 * Assign layers by BFS depth (fallback for cyclic graphs)
 */
function assignLayersByDepth(
  nodes: Node[],
  outgoing: Map<string, string[]>,
  incoming: Map<string, string[]>
): string[][] {
  // Start from source nodes (nodes with no incoming edges)
  const sources = nodes.filter(
    (n) => (incoming.get(n.id)?.length ?? 0) === 0
  );

  // If no sources, pick arbitrary starting nodes
  const startNodes = sources.length > 0 ? sources : nodes.slice(0, 1);

  const visited = new Set<string>();
  const layerMap = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = [];

  for (const node of startNodes) {
    queue.push({ id: node.id, depth: 0 });
    visited.add(node.id);
    layerMap.set(node.id, 0);
  }

  // BFS to assign depths
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;

    for (const neighbor of outgoing.get(id) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        layerMap.set(neighbor, depth + 1);
        queue.push({ id: neighbor, depth: depth + 1 });
      }
    }
  }

  // Add unvisited nodes (disconnected components)
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      layerMap.set(node.id, 0);
    }
  }

  // Group by layer
  const maxLayer = Math.max(...Array.from(layerMap.values()), 0);
  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);

  for (const [nodeId, layer] of layerMap) {
    layers[layer].push(nodeId);
  }

  return layers;
}

/**
 * Calculate positions for layered nodes
 */
function calculateLayeredPositions(
  layers: string[][],
  nodes: Node[],
  config: LayoutConfig
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex];

    for (let nodeIndex = 0; nodeIndex < layer.length; nodeIndex++) {
      const nodeId = layer[nodeIndex];
      let position: { x: number; y: number };

      if (config.direction === "LR") {
        // Left to right: X increases with layers, Y increases within layer
        position = {
          x: layerIndex * config.layerSpacing,
          y: nodeIndex * config.nodeSpacing,
        };
      } else {
        // Top to bottom: Y increases with layers, X increases within layer
        position = {
          x: nodeIndex * config.nodeSpacing,
          y: layerIndex * config.layerSpacing,
        };
      }

      positions.set(nodeId, snapToGrid(position, config.gridSnap));
    }
  }

  return positions;
}

/**
 * Calculate positions for isolated nodes (compact grid off to the side)
 */
function calculateIsolatedPositions(
  isolated: string[],
  nodes: Node[],
  layers: string[][],
  config: LayoutConfig
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  if (isolated.length === 0) {
    return positions;
  }

  // Calculate offset based on layered nodes extent
  const maxLayerIndex = layers.length;

  let offsetX: number;
  let offsetY: number;

  if (config.direction === "LR") {
    // Place isolated nodes to the right of main graph
    offsetX = (maxLayerIndex + 1) * config.layerSpacing;
    offsetY = 0;
  } else {
    // Place isolated nodes below main graph
    offsetX = 0;
    offsetY = (maxLayerIndex + 1) * config.layerSpacing;
  }

  // Arrange in compact grid (4 nodes per row)
  const nodesPerRow = 4;

  for (let i = 0; i < isolated.length; i++) {
    const row = Math.floor(i / nodesPerRow);
    const col = i % nodesPerRow;

    const position = {
      x: offsetX + col * config.isolatedNodeSpacing,
      y: offsetY + row * config.isolatedNodeSpacing,
    };

    positions.set(isolated[i], snapToGrid(position, config.gridSnap));
  }

  return positions;
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
