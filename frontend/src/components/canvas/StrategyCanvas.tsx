"use client";

import { useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  Node,
  Edge,
  Connection,
  addEdge,
  ReactFlowProvider,
  ReactFlowInstance,
  applyNodeChanges,
  applyEdgeChanges,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { BlockMeta, BlockType, getBlockMeta, ValidationError } from "@/types/canvas";
import { generateBlockId } from "@/lib/canvas-utils";

interface StrategyCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onSelectionChange: (selectedNodes: Node[]) => void;
  onAddNote: () => void;
  globalValidationErrors?: ValidationError[];
}

function CanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onSelectionChange,
  onAddNote,
  globalValidationErrors,
}: StrategyCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(connection, edges);
      onEdgesChange(newEdges);
    },
    [edges, onEdgesChange]
  );

  // Handle node selection
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      onSelectionChange(selectedNodes);
    },
    [onSelectionChange]
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

      onNodesChange([...nodes, newNode]);
    },
    [nodes, onNodesChange]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof applyNodeChanges>[0]) => {
      onNodesChange(applyNodeChanges(changes, nodes));
    },
    [nodes, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof applyEdgeChanges>[0]) => {
      onEdgesChange(applyEdgeChanges(changes, edges));
    },
    [edges, onEdgesChange]
  );

  return (
    <div ref={reactFlowWrapper} className="flex h-full w-full flex-col">
      {globalValidationErrors && globalValidationErrors.length > 0 && (
        <div className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          <p className="font-medium">Strategy Issues:</p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {globalValidationErrors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex-1">
        <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onSelectionChange={handleSelectionChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={null}
        selectNodesOnDrag={false}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { strokeWidth: 2 },
        }}
      >
        <Background gap={15} size={1} />
        <Controls>
          <ControlButton onClick={onAddNote} title="Add Note">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </ControlButton>
        </Controls>
      </ReactFlow>
      </div>
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
