"use client";

import { useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { BlockMeta, BlockType, getBlockMeta } from "@/types/canvas";
import { generateBlockId } from "@/lib/canvas-utils";

interface StrategyCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeSelect: (node: Node | null) => void;
}

function CanvasInner({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
}: StrategyCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Sync nodes changes to parent
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChangeInternal>[0]) => {
      onNodesChangeInternal(changes);
      // We'll notify parent after state updates
    },
    [onNodesChangeInternal]
  );

  // Sync edges changes to parent
  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChangeInternal>[0]) => {
      onEdgesChangeInternal(changes);
    },
    [onEdgesChangeInternal]
  );

  // Notify parent when nodes/edges actually change
  const handleNodesChangeComplete = useCallback(
    (updatedNodes: Node[]) => {
      onNodesChange(updatedNodes);
    },
    [onNodesChange]
  );

  const handleEdgesChangeComplete = useCallback(
    (updatedEdges: Edge[]) => {
      onEdgesChange(updatedEdges);
    },
    [onEdgesChange]
  );

  // Update parent when nodes change
  useCallback(() => {
    handleNodesChangeComplete(nodes);
  }, [nodes, handleNodesChangeComplete]);

  // Update parent when edges change
  useCallback(() => {
    handleEdgesChangeComplete(edges);
  }, [edges, handleEdgesChangeComplete]);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(connection, eds);
        onEdgesChange(newEdges);
        return newEdges;
      });
    },
    [setEdges, onEdgesChange]
  );

  // Handle node selection
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      onNodeSelect(selectedNodes.length === 1 ? selectedNodes[0] : null);
    },
    [onNodeSelect]
  );

  // Handle drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const blockMetaJson = event.dataTransfer.getData("application/blockMeta");
      if (!blockMetaJson || !reactFlowInstance.current) return;

      const blockMeta: BlockMeta = JSON.parse(blockMetaJson);
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: generateBlockId(),
        type: blockMeta.type,
        position,
        data: {
          label: blockMeta.label,
          params: { ...blockMeta.defaultParams },
          blockType: blockMeta.type,
        },
      };

      setNodes((nds) => {
        const updatedNodes = [...nds, newNode];
        onNodesChange(updatedNodes);
        return updatedNodes;
      });
    },
    [setNodes, onNodesChange]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  // Handle node changes and notify parent
  const onNodeDragStop = useCallback(() => {
    onNodesChange(nodes);
  }, [nodes, onNodesChange]);

  return (
    <div ref={reactFlowWrapper} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onInit={onInit}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { strokeWidth: 2 },
        }}
      >
        <Background gap={15} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

// Expose method to update params from properties panel
export function useCanvasActions(
  nodes: Node[],
  setNodes: (nodes: Node[]) => void,
  onNodesChange: (nodes: Node[]) => void
) {
  const updateNodeParams = useCallback(
    (nodeId: string, params: Record<string, unknown>) => {
      const updatedNodes = nodes.map((node) => {
        if (node.id === nodeId) {
          const blockMeta = getBlockMeta(node.type as BlockType);
          return {
            ...node,
            data: {
              ...node.data,
              params,
              label: blockMeta?.label || node.data?.label,
            },
          };
        }
        return node;
      });
      setNodes(updatedNodes);
      onNodesChange(updatedNodes);
    },
    [nodes, setNodes, onNodesChange]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      const updatedNodes = nodes.filter((node) => node.id !== nodeId);
      setNodes(updatedNodes);
      onNodesChange(updatedNodes);
    },
    [nodes, setNodes, onNodesChange]
  );

  return { updateNodeParams, deleteNode };
}

export default function StrategyCanvas(props: StrategyCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
