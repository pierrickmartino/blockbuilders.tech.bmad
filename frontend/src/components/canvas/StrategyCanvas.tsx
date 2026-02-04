"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  onAutoArrange?: (direction: "LR" | "TB") => void;
  onTidyConnections?: () => void;
  onLayoutMenu?: () => void;
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
  onAutoArrange,
  onTidyConnections,
  onLayoutMenu,
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
        // Don't toggle expansion if clicking on interactive elements
        const isInteractive = target.closest('input, button, select, textarea, [data-no-toggle]');

        // For mobile: cancel if connecting
        if (isMobileMode && connectionState.mode === "connecting") {
          setConnectionState({ mode: "idle" });
        }
        // For compact mode: call expand/collapse handler (but not when clicking interactive elements)
        if (onNodeClickProp && !isInteractive) {
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
        <div className="mb-3 rounded-xl border border-rose-200/70 bg-white/90 px-4 py-3 text-sm text-rose-700 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur-sm">
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
      <div
        className={`relative flex-1 overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-slate-100/80 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.5)] ${isMobileMode ? "pb-14" : ""}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(148,163,184,0.16),transparent_45%),radial-gradient(circle_at_88%_14%,rgba(99,102,241,0.09),transparent_38%),radial-gradient(circle_at_52%_86%,rgba(15,23,42,0.05),transparent_45%)]" />
        <ReactFlow
          className="relative z-10 h-full w-full bg-transparent text-slate-900 [&_.react-flow__pane]:cursor-grab [&_.react-flow__pane]:active:cursor-grabbing [&_.react-flow__selection]:border-indigo-300/90 [&_.react-flow__selection]:bg-indigo-100/25 [&_.react-flow__controls]:m-4 [&_.react-flow__controls]:overflow-hidden [&_.react-flow__controls]:rounded-xl [&_.react-flow__controls]:border [&_.react-flow__controls]:border-slate-200 [&_.react-flow__controls]:bg-white/90 [&_.react-flow__controls]:backdrop-blur-xl [&_.react-flow__controls]:shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] [&_.react-flow__controls-button]:h-10 [&_.react-flow__controls-button]:w-10 [&_.react-flow__controls-button]:border-slate-200/90 [&_.react-flow__controls-button]:bg-transparent [&_.react-flow__controls-button]:text-slate-700 [&_.react-flow__controls-button:hover]:bg-slate-50 [&_.react-flow__node]:bg-transparent [&_.react-flow__node]:border-0 [&_.react-flow__node]:p-0 [&_.react-flow__node]:transition-all [&_.react-flow__node]:duration-200 [&_.react-flow__node:hover]:-translate-y-0.5 [&_.react-flow__node:hover]:drop-shadow-[0_14px_30px_-18px_rgba(15,23,42,0.45)] [&_.react-flow__node.selected]:drop-shadow-[0_16px_36px_-20px_rgba(79,70,229,0.45)] [&_.react-flow__handle]:border-2 [&_.react-flow__handle]:border-white [&_.react-flow__handle]:shadow-[0_0_0_2px_rgba(15,23,42,0.14)] [&_.react-flow__handle]:transition-transform [&_.react-flow__handle:hover]:scale-105 [&_.react-flow__edge.animated_.react-flow__edge-path]:stroke-dasharray-[6_6] [&_.react-flow__edge.animated_.react-flow__edge-path]:drop-shadow-[0_0_7px_rgba(99,102,241,0.4)]"
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
            animated: true,
            style: {
              strokeWidth: 2.2,
              stroke: "#6366f1",
              strokeOpacity: 0.9,
              strokeLinecap: "round",
            },
          }}
          connectionLineStyle={{
            strokeWidth: 2.2,
            stroke: "#6366f1",
            strokeDasharray: "3 5",
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={26}
            size={1.1}
            color="#cbd5e1"
            className="opacity-70"
          />
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
              {(onAutoArrange || onTidyConnections) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <ControlButton title="Auto-arrange">
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
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    </ControlButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onAutoArrange && (
                      <>
                        <DropdownMenuItem onClick={() => onAutoArrange("LR")}>
                          Left → Right
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAutoArrange("TB")}>
                          Top → Bottom
                        </DropdownMenuItem>
                      </>
                    )}
                    {onAutoArrange && onTidyConnections && <DropdownMenuSeparator />}
                    {onTidyConnections && (
                      <DropdownMenuItem onClick={onTidyConnections}>
                        Tidy connections
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </Controls>
          )}
        </ReactFlow>

        {/* Tap-to-connect feedback overlay */}
        {isMobileMode && connectionState.mode === "connecting" && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-slate-200/80 bg-white/95 px-4 py-2 text-sm text-slate-700 shadow-[0_16px_35px_-20px_rgba(15,23,42,0.45)] backdrop-blur">
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
            onLayoutMenu={onLayoutMenu || (() => {})}
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
