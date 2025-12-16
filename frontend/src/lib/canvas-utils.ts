import type { Node, Edge } from "@xyflow/react";
import type { Block, Connection, StrategyDefinition, BlockType } from "@/types/canvas";

// Generate a unique block ID
export function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Convert our JSON definition to React Flow nodes and edges
export function definitionToReactFlow(
  definition: StrategyDefinition | null
): { nodes: Node[]; edges: Edge[] } {
  if (!definition || !definition.blocks) {
    return { nodes: [], edges: [] };
  }

  const nodes: Node[] = definition.blocks.map((block) => ({
    id: block.id,
    type: block.type,
    position: block.position,
    data: {
      label: block.label,
      params: block.params,
      blockType: block.type,
    },
  }));

  const edges: Edge[] = definition.connections.map((conn, index) => {
    // Handle both old format (from/to) and new format (from_port/to_port)
    const fromPort = conn.from_port || (conn as unknown as { from: { block_id: string; port: string } }).from;
    const toPort = conn.to_port || (conn as unknown as { to: { block_id: string; port: string } }).to;
    return {
      id: `edge-${index}`,
      source: fromPort?.block_id || "",
      sourceHandle: fromPort?.port || "output",
      target: toPort?.block_id || "",
      targetHandle: toPort?.port || "input",
    };
  });

  return { nodes, edges };
}

// Convert React Flow nodes and edges back to our JSON definition
export function reactFlowToDefinition(
  nodes: Node[],
  edges: Edge[]
): StrategyDefinition {
  const blocks: Block[] = nodes.map((node) => ({
    id: node.id,
    type: node.type as BlockType,
    label: String(node.data?.label || node.type || "Block"),
    position: { x: node.position.x, y: node.position.y },
    params: (node.data?.params as Record<string, unknown>) || {},
  }));

  const connections: Connection[] = edges.map((edge) => ({
    from_port: {
      block_id: edge.source,
      port: edge.sourceHandle || "output",
    },
    to_port: {
      block_id: edge.target,
      port: edge.targetHandle || "input",
    },
  }));

  return {
    blocks,
    connections,
    meta: { version: 1 },
  };
}

// Create a default empty strategy definition with pre-placed blocks
export function createDefaultDefinition(): StrategyDefinition {
  return {
    blocks: [
      {
        id: "price-1",
        type: "price",
        label: "Price",
        position: { x: 100, y: 200 },
        params: { source: "close" },
      },
      {
        id: "entry-1",
        type: "entry_signal",
        label: "Entry Signal",
        position: { x: 600, y: 150 },
        params: {},
      },
      {
        id: "exit-1",
        type: "exit_signal",
        label: "Exit Signal",
        position: { x: 600, y: 300 },
        params: {},
      },
    ],
    connections: [],
    meta: { version: 1 },
  };
}
