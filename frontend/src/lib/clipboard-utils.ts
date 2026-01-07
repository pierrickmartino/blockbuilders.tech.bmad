import type { Node, Edge } from "@xyflow/react";
import { generateBlockId } from "./canvas-utils";

export interface ClipboardData {
  blocks: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number };
    params: Record<string, unknown>;
    data: Record<string, unknown>;
  }>;
  connections: Array<{
    from: { block_id: string; port: string };
    to: { block_id: string; port: string };
  }>;
}

const CLIPBOARD_KEY = "blockbuilders_clipboard";
const POSITION_OFFSET = 24;

/**
 * Copy selected nodes and their internal connections to localStorage
 */
export function copyToClipboard(
  selectedNodeIds: Set<string>,
  nodes: Node[],
  edges: Edge[]
): void {
  if (selectedNodeIds.size === 0) return;

  // Filter selected nodes
  const selectedNodes = nodes.filter((n) => selectedNodeIds.has(n.id));

  // Filter internal connections only (both endpoints must be selected)
  const internalEdges = edges.filter(
    (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
  );

  const clipboardData: ClipboardData = {
    blocks: selectedNodes.map((node) => ({
      id: node.id,
      type: node.type || "unknown",
      label: String(node.data?.label || ""),
      position: { ...node.position },
      params: (node.data?.params as Record<string, unknown>) || {},
      data: { ...node.data },
    })),
    connections: internalEdges.map((edge) => ({
      from: {
        block_id: edge.source,
        port: edge.sourceHandle || "output",
      },
      to: {
        block_id: edge.target,
        port: edge.targetHandle || "input",
      },
    })),
  };

  localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(clipboardData));
}

/**
 * Paste nodes from localStorage, generating new IDs and offsetting positions
 * Returns null if clipboard is empty or invalid
 */
export function pasteFromClipboard(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } | null {
  const data = localStorage.getItem(CLIPBOARD_KEY);
  if (!data) return null;

  try {
    const clipboardData: ClipboardData = JSON.parse(data);

    // Create ID mapping: old ID -> new ID
    const idMap = new Map<string, string>();
    clipboardData.blocks.forEach((block) => {
      idMap.set(block.id, generateBlockId());
    });

    // Create new nodes with new IDs and offset positions
    const newNodes: Node[] = clipboardData.blocks.map((block) => ({
      id: idMap.get(block.id)!,
      type: block.type,
      position: {
        x: block.position.x + POSITION_OFFSET,
        y: block.position.y + POSITION_OFFSET,
      },
      data: {
        ...block.data,
        label: block.label,
        params: block.params,
      },
    }));

    // Create new edges with remapped IDs
    const newEdges: Edge[] = clipboardData.connections.map((conn, idx) => ({
      id: `edge-${Date.now()}-${idx}`,
      source: idMap.get(conn.from.block_id)!,
      sourceHandle: conn.from.port,
      target: idMap.get(conn.to.block_id)!,
      targetHandle: conn.to.port,
    }));

    return {
      nodes: [...nodes, ...newNodes],
      edges: [...edges, ...newEdges],
    };
  } catch (err) {
    console.error("Failed to parse clipboard data:", err);
    localStorage.removeItem(CLIPBOARD_KEY);
    return null;
  }
}
