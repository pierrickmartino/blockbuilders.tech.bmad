"use client";

import { useCallback, useRef, useState } from "react";
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
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { BlockMeta, BlockType, getBlockMeta, ValidationError } from "@/types/canvas";
import { generateBlockId } from "@/lib/canvas-utils";
import { MobileBottomBar } from "./MobileBottomBar";

interface StrategyCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onSelectionChange: (selectedNodes: Node[]) => void;
  onAddNote: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  globalValidationErrors?: ValidationError[];
  isMobileMode?: boolean;
  onInit?: (instance: ReactFlowInstance) => void;
  onNodeClick?: (nodeId: string) => void;
}

type ConnectionState =
  | { mode: "idle" }
  | { mode: "connecting"; sourceNode: string; sourceHandle: string };

function CanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onSelectionChange,
  onAddNote,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  globalValidationErrors,
  isMobileMode = false,
  onInit: onInitProp,
  onNodeClick: onNodeClickProp,
}: StrategyCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    mode: "idle",
  });

  // ReactFlow instance for zoom/fit controls
  const reactFlow = useReactFlow();

  // Zoom and fit handlers for mobile bottom bar
  const handleZoomIn = useCallback(() => {
    reactFlow.zoomIn();
  }, [reactFlow]);

  const handleZoomOut = useCallback(() => {
    reactFlow.zoomOut();
  }, [reactFlow]);

  const handleFitView = useCallback(() => {
    reactFlow.fitView();
  }, [reactFlow]);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(connection, edges);
      onEdgesChange(newEdges);
    },
    [edges, onEdgesChange]
  );

  // Handle tap-to-connect for mobile and compact mode expand/collapse
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const target = event.target as HTMLElement;
      const handle = target.closest('[data-handleid]') as HTMLElement | null;

      if (!handle) {
        // Clicked node body (not a handle)
        // For mobile: cancel if connecting
        if (isMobileMode && connectionState.mode === "connecting") {
          setConnectionState({ mode: "idle" });
        }
        // For compact mode: call expand/collapse handler
        if (onNodeClickProp) {
          onNodeClickProp(node.id);
        }
        return;
      }

      // Handle click is for mobile tap-to-connect only
      if (!isMobileMode) return;

      const handleId = handle.getAttribute("data-handleid");
      const handleType = handle.getAttribute("data-handletype");

      if (connectionState.mode === "idle") {
        // Start connection from source
        if (handleType === "source") {
          setConnectionState({
            mode: "connecting",
            sourceNode: node.id,
            sourceHandle: handleId || "output",
          });
        }
      } else {
        // Complete connection to target
        if (handleType === "target") {
          const newConnection: Connection = {
            source: connectionState.sourceNode,
            sourceHandle: connectionState.sourceHandle,
            target: node.id,
            targetHandle: handleId || "input",
          };
          onEdgesChange(addEdge(newConnection, edges));
          setConnectionState({ mode: "idle" });
        }
      }
    },
    [isMobileMode, connectionState, edges, onEdgesChange, onNodeClickProp]
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

  const onInit = useCallback(
    (instance: ReactFlowInstance) => {
      reactFlowInstance.current = instance;
      onInitProp?.(instance);
    },
    [onInitProp]
  );

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
          <ul className="mt-1 space-y-1 text-xs">
            {globalValidationErrors.map((err, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="flex-1">{err.user_message || err.message}</span>
                {err.help_link && (
                  <a
                    href={err.help_link}
                    className="text-red-700 underline hover:text-red-900 whitespace-nowrap"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Learn more
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={`flex-1 ${isMobileMode ? "pb-14" : ""}`}>
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
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={null}
        selectNodesOnDrag={!isMobileMode}
        panOnScroll={!isMobileMode}
        zoomOnScroll={!isMobileMode}
        panOnDrag={isMobileMode ? [1, 2] : [1]}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { strokeWidth: 2 },
        }}
      >
        <Background gap={15} size={1} />
        {!isMobileMode && (
          <Controls>
            <ControlButton
              onClick={onUndo}
              title="Undo (Cmd/Ctrl+Z)"
              disabled={!canUndo}
            >
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
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
              </svg>
            </ControlButton>
            <ControlButton
              onClick={onRedo}
              title="Redo (Cmd/Ctrl+Shift+Z)"
              disabled={!canRedo}
            >
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
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
              </svg>
            </ControlButton>
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
        )}
      </ReactFlow>

      {/* Tap-to-connect feedback overlay */}
      {isMobileMode && connectionState.mode === "connecting" && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow-lg">
          Tap target port, or tap outside to cancel
        </div>
      )}

      {/* Mobile bottom action bar */}
      {isMobileMode && (
        <MobileBottomBar
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onAddNote={onAddNote}
          onUndo={onUndo || (() => {})}
          onRedo={onRedo || (() => {})}
          canUndo={canUndo || false}
          canRedo={canRedo || false}
        />
      )}
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
