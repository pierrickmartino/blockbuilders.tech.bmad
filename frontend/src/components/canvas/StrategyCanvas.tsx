"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ReactFlowInstance,
  applyNodeChanges,
  applyEdgeChanges,
  SelectionMode,
  useReactFlow,
  useNodesInitialized,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import DeleteButtonEdge, { DeleteButtonEdgeData } from "./edges/DeleteButtonEdge";
import { BlockType, getBlockMeta, ValidationError } from "@/types/canvas";
import { generateBlockId, tidyConnections } from "@/lib/canvas-utils";
import { generateNodeSummary } from "@/lib/node-summary";
import { useChartTheme } from "@/lib/chart-theme";
import { getCanvasFlags, CANVAS_FLAGS } from "@/lib/feature-flags";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  ANALYTICS_POSTHOG_INITIALIZED_EVENT,
  trackEvent,
} from "@/lib/analytics";
import { useDisplay } from "@/context/display";
import { useCanvasState } from "@/context/CanvasStateContext";
import { MobileBottomBar } from "./MobileBottomBar";
import { CanvasMinimap } from "./CanvasMinimap";
import { ReadinessProvider } from "@/context/ReadinessContext";
import InlinePopover from "./InlinePopover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAutoArrange } from "@/hooks/use-auto-arrange";
import { toast } from "sonner";

export type CanvasEdge = Edge<DeleteButtonEdgeData, "deletable">;

export interface StrategyCanvasProps {
  onContainerMount?: (el: HTMLDivElement | null) => void;
  onOpenCommandPalette?: () => void;
  onInit?: (instance: ReactFlowInstance<Node, CanvasEdge>) => void;
}

type ConnectionState =
  | { mode: "idle" }
  | { mode: "connecting"; sourceNode: string; sourceHandle: string };

function CanvasInner({
  onContainerMount,
  onOpenCommandPalette,
  onInit: onInitProp,
}: StrategyCanvasProps) {
  const { state, dispatch, canUndo, canRedo, flushSnapshot, commitSnapshot } = useCanvasState();
  const { isMobileCanvasMode: isMobileMode, nodeDisplayMode } = useDisplay();

  // Feature flags (absorbed from SmartCanvas)
  const hasTrackedRef = useRef(false);
  const [canvasFlags, setCanvasFlags] = useState(() => getCanvasFlags());
  const [inlinePopoverEnabled, setInlinePopoverEnabled] = useState(
    () => canvasFlags.flags[CANVAS_FLAGS.inlinePopover] ?? false
  );

  useEffect(() => {
    const refreshCanvasFlags = () => {
      setCanvasFlags((previous) => {
        const next = getCanvasFlags();
        if (previous.hadFallback !== next.hadFallback) return next;
        for (const key of Object.keys(previous.flags) as Array<keyof typeof previous.flags>) {
          if (previous.flags[key] !== next.flags[key]) return next;
        }
        return previous;
      });
    };
    refreshCanvasFlags();
    window.addEventListener(ANALYTICS_POSTHOG_INITIALIZED_EVENT, refreshCanvasFlags);
    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, refreshCanvasFlags);
    return () => {
      window.removeEventListener(ANALYTICS_POSTHOG_INITIALIZED_EVENT, refreshCanvasFlags);
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, refreshCanvasFlags);
    };
  }, []);

  useEffect(() => {
    setInlinePopoverEnabled(canvasFlags.flags[CANVAS_FLAGS.inlinePopover] ?? false);
  }, [canvasFlags.flags]);

  useEffect(() => {
    if (hasTrackedRef.current) return;
    hasTrackedRef.current = true;
    trackEvent("smartcanvas_rendered");
    if (canvasFlags.hadFallback) {
      trackEvent("smartcanvas_flag_fallback_used");
    }
  }, [canvasFlags.hadFallback]);

  // Mobile layout menu state (previously in page)
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Derive display-enriched nodes from context + display context
  const nodes = useMemo(
    () =>
      state.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isMobileMode,
          isCompact: nodeDisplayMode === "compact",
          isExpanded: state.expandedNodeIds.includes(node.id),
          summary: generateNodeSummary(
            node.type || "",
            (node.data?.params as Record<string, unknown>) || {},
            String(node.data?.label || "")
          ),
        },
      })),
    [state.nodes, state.expandedNodeIds, isMobileMode, nodeDisplayMode]
  );

  const edges = state.edges;

  const edgeTypes = {
    deletable: DeleteButtonEdge,
  };

  const decoratedEdges: CanvasEdge[] = edges.map((edge) => ({
    ...edge,
    type: "deletable",
    data: {
      ...(edge.data || {}),
      showDeleteButton: isMobileMode,
    },
  })) as CanvasEdge[];

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<Node, CanvasEdge> | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({ mode: "idle" });

  const reactFlow = useReactFlow<Node, CanvasEdge>();
  const chartTheme = useChartTheme();
  const nodesInitialized = useNodesInitialized();

  const handleZoomIn = useCallback(() => { reactFlow.zoomIn(); }, [reactFlow]);
  const handleZoomOut = useCallback(() => { reactFlow.zoomOut(); }, [reactFlow]);
  const handleFitView = useCallback(() => { reactFlow.fitView(); }, [reactFlow]);

  const onConnect = useCallback(
    (connection: Connection) => {
      dispatch({ type: "SET_EDGES", payload: addEdge(connection, state.edges) });
    },
    [state.edges, dispatch]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const target = event.target as HTMLElement;
      const handle = target.closest("[data-handleid]") as HTMLElement | null;

      if (!handle) {
        const isInteractive = target.closest("input, button, select, textarea, [data-no-toggle]");
        if (isMobileMode && connectionState.mode === "connecting") {
          setConnectionState({ mode: "idle" });
        }
        if (!isInteractive) {
          dispatch({ type: "TOGGLE_EXPANDED", payload: node.id });
        }
        return;
      }

      if (!isMobileMode) return;

      const handleId = handle.getAttribute("data-handleid");
      const handleType = handle.getAttribute("data-handletype");

      if (connectionState.mode === "idle") {
        if (handleType === "source") {
          setConnectionState({
            mode: "connecting",
            sourceNode: node.id,
            sourceHandle: handleId || "output",
          });
        }
      } else {
        if (handleType === "target") {
          const newConnection: Connection = {
            source: connectionState.sourceNode,
            sourceHandle: connectionState.sourceHandle,
            target: node.id,
            targetHandle: handleId || "input",
          };
          dispatch({ type: "SET_EDGES", payload: addEdge(newConnection, state.edges) });
          setConnectionState({ mode: "idle" });
        }
      }
    },
    [isMobileMode, connectionState, state.edges, dispatch]
  );

  const prevSelectionRef = useRef<string[]>([]);
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      const newIds = selectedNodes.map((n) => n.id);
      const prev = prevSelectionRef.current;
      if (
        newIds.length === prev.length &&
        newIds.every((id, i) => id === prev[i])
      ) {
        return;
      }
      prevSelectionRef.current = newIds;

      if (selectedNodes.length === 0) {
        dispatch({ type: "DESELECT_ALL" });
      } else if (selectedNodes.length === 1) {
        dispatch({ type: "SELECT_NODE", payload: selectedNodes[0].id });
      } else {
        dispatch({ type: "SET_SELECTION", payload: newIds });
      }
    },
    [dispatch]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const blockMetaJson = event.dataTransfer.getData("application/blockMeta");
      if (!blockMetaJson || !reactFlowInstanceRef.current) return;

      const blockMeta = JSON.parse(blockMetaJson);
      const position = reactFlowInstanceRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      dispatch({
        type: "ADD_NODE",
        payload: {
          id: generateBlockId(),
          type: blockMeta.type,
          position,
          data: {
            label: blockMeta.label,
            params: { ...blockMeta.defaultParams },
            blockType: blockMeta.type,
          },
        },
      });
    },
    [dispatch]
  );

  const onInit = useCallback(
    (instance: ReactFlowInstance<Node, CanvasEdge>) => {
      reactFlowInstanceRef.current = instance;
      dispatch({ type: "SET_REACTFLOW_INSTANCE", payload: instance as ReactFlowInstance<Node, Edge> });
      onInitProp?.(instance);
    },
    [dispatch, onInitProp]
  );

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof applyNodeChanges>[0]) => {
      dispatch({ type: "SET_NODES", payload: applyNodeChanges(changes, state.nodes) });
    },
    [state.nodes, dispatch]
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof applyEdgeChanges>[0]) => {
      dispatch({ type: "SET_EDGES", payload: applyEdgeChanges(changes, state.edges) });
    },
    [state.edges, dispatch]
  );

  const handleAddNote = useCallback(() => {
    const noteId = generateBlockId();
    dispatch({
      type: "ADD_NODE",
      payload: {
        id: noteId,
        type: "note",
        position: { x: 400, y: 300 },
        data: { text: "" },
      },
    });
    dispatch({ type: "SELECT_NODE", payload: noteId });
  }, [dispatch]);

  const handleUndo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, [dispatch]);

  const handleRedo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, [dispatch]);

  // Inline popover handlers
  const handlePopoverParamsChange = useCallback(
    (nodeId: string, params: Record<string, unknown>) => {
      const node = state.nodes.find((n) => n.id === nodeId);
      const blockMeta = node ? getBlockMeta(node.type as BlockType) : undefined;
      dispatch({
        type: "UPDATE_PARAMS",
        payload: { nodeId, params },
      });
      if (blockMeta) {
        dispatch({
          type: "SET_NODES",
          payload: state.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, params, label: blockMeta.label || n.data?.label } }
              : n
          ),
        });
      }
    },
    [state.nodes, dispatch]
  );

  const handlePopoverDeleteNode = useCallback(
    (nodeId: string) => {
      const deletedNode = state.nodes.find((n) => n.id === nodeId);
      const label = (deletedNode?.data?.label as string | undefined) ?? "Block";
      flushSnapshot();
      dispatch({ type: "DELETE_NODE", payload: nodeId });
      toast(`"${label}" deleted`, {
        action: {
          label: "Undo",
          onClick: () => dispatch({ type: "UNDO" }),
        },
        duration: 5000,
      });
    },
    [state.nodes, dispatch, flushSnapshot]
  );

  const handlePopoverClose = useCallback(() => {
    dispatch({ type: "DESELECT_ALL" });
  }, [dispatch]);

  // Auto-arrange
  const { isArranging, handleAutoArrange } = useAutoArrange({
    nodes: state.nodes,
    edges: state.edges,
    strategyId: "",
    reactFlowRef: reactFlowInstanceRef as React.RefObject<ReactFlowInstance | null>,
    canvasContainerRef,
    flushSnapshot,
    commitSnapshot,
    onNodesChange: (updated) => dispatch({ type: "SET_NODES", payload: updated }),
    setShowLayoutMenu,
  });

  // Tidy connections
  const handleTidyConnections = useCallback(() => {
    const tidiedEdges = tidyConnections(state.edges);
    flushSnapshot();
    commitSnapshot(state.nodes, tidiedEdges);
    dispatch({ type: "SET_EDGES", payload: tidiedEdges });
    setShowLayoutMenu(false);
  }, [state.nodes, state.edges, dispatch, flushSnapshot, commitSnapshot]);

  const globalValidationErrors = state.validationErrors.filter((e: ValidationError) => !e.block_id);

  return (
    <ReadinessProvider nodes={nodes} edges={edges}>
      <div ref={reactFlowWrapper} className="flex h-full w-full flex-col">
        {globalValidationErrors.length > 0 && (
          <div className="mb-3 rounded-xl border border-rose-200/70 dark:border-rose-800/70 bg-white/90 dark:bg-slate-900/90 px-4 py-3 text-sm text-rose-700 dark:text-rose-400 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <p className="font-medium">Strategy Issues:</p>
            <ul className="mt-1 space-y-1 text-xs">
              {globalValidationErrors.map((err: ValidationError, i: number) => (
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
          ref={(el) => {
            canvasContainerRef.current = el;
            onContainerMount?.(el);
          }}
          className={`relative flex-1 overflow-hidden rounded-xl border border-border bg-secondary shadow-sm ${isMobileMode ? "pb-14" : ""}`}
        >
          <ReactFlow<Node, CanvasEdge>
            className="relative z-10 h-full w-full bg-transparent text-slate-900 dark:text-slate-100 [&_.react-flow__pane]:cursor-grab [&_.react-flow__pane]:active:cursor-grabbing [&_.react-flow__selection]:border-indigo-300/90 [&_.react-flow__selection]:bg-indigo-100/25 dark:[&_.react-flow__selection]:bg-indigo-900/30 [&_.react-flow__controls]:m-4 [&_.react-flow__controls]:overflow-hidden [&_.react-flow__controls]:rounded-xl [&_.react-flow__controls]:border [&_.react-flow__controls]:border-slate-200 dark:[&_.react-flow__controls]:border-slate-700 [&_.react-flow__controls]:bg-white/90 dark:[&_.react-flow__controls]:bg-slate-800/90 [&_.react-flow__controls]:backdrop-blur-xl [&_.react-flow__controls]:shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] [&_.react-flow__controls-button]:h-10 [&_.react-flow__controls-button]:w-10 [&_.react-flow__controls-button]:border-slate-200/90 dark:[&_.react-flow__controls-button]:border-slate-700/90 [&_.react-flow__controls-button]:bg-transparent [&_.react-flow__controls-button]:text-slate-700 dark:[&_.react-flow__controls-button]:text-slate-300 [&_.react-flow__controls-button:hover]:bg-slate-50 dark:[&_.react-flow__controls-button:hover]:bg-slate-700 [&_.react-flow__node]:bg-transparent [&_.react-flow__node]:border-0 [&_.react-flow__node]:p-0 [&_.react-flow__node]:transition-all [&_.react-flow__node]:duration-200 [&_.react-flow__node:hover]:-translate-y-0.5 [&_.react-flow__node:hover]:drop-shadow-[0_14px_30px_-18px_rgba(15,23,42,0.45)] [&_.react-flow__node.selected]:drop-shadow-[0_16px_36px_-20px_rgba(79,70,229,0.45)] [&_.react-flow__handle]:border-2 [&_.react-flow__handle]:border-white dark:[&_.react-flow__handle]:border-slate-800 [&_.react-flow__handle]:shadow-[0_0_0_2px_rgba(15,23,42,0.14)] [&_.react-flow__handle]:transition-transform [&_.react-flow__handle:hover]:scale-105 [&_.react-flow__edge.animated_.react-flow__edge-path]:stroke-dasharray-[6_6] [&_.react-flow__edge.animated_.react-flow__edge-path]:drop-shadow-[0_0_7px_rgba(99,102,241,0.4)]"
            nodes={nodes}
            edges={decoratedEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onSelectionChange={handleSelectionChange}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onInit={onInit}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
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
                stroke: chartTheme.primary,
                strokeOpacity: 0.9,
                strokeLinecap: "round",
              },
            }}
            connectionLineStyle={{
              strokeWidth: 2.2,
              stroke: chartTheme.primary,
              strokeDasharray: "3 5",
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.2}
              color={chartTheme.grid}
            />
            {!isMobileMode && nodes.length === 0 && onOpenCommandPalette && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-slate-400 dark:text-slate-500 select-none">
                  Drag a block from the left panel, or press{" "}
                  <kbd className="rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-xs font-mono">
                    ⌘K
                  </kbd>
                </p>
              </div>
            )}
            {!isMobileMode && (
              <Controls>
                <ControlButton onClick={handleUndo} title="Undo (Cmd/Ctrl+Z)" disabled={!canUndo}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
                  </svg>
                </ControlButton>
                <ControlButton onClick={handleRedo} title="Redo (Cmd/Ctrl+Shift+Z)" disabled={!canRedo}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M21 7v6h-6" />
                    <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
                  </svg>
                </ControlButton>
                <ControlButton onClick={handleAddNote} title="Add Note">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </ControlButton>
                {onOpenCommandPalette && (
                  <ControlButton onClick={onOpenCommandPalette} title="Insert node (⌘K)">
                    <span className="text-[10px] font-semibold leading-none tracking-tight">⌘K</span>
                  </ControlButton>
                )}
                <ControlButton
                  title="Auto-arrange"
                  onClick={handleAutoArrange}
                  disabled={!nodesInitialized || isArranging}
                  style={{ opacity: (nodesInitialized && !isArranging) ? 1 : 0.4, cursor: (nodesInitialized && !isArranging) ? "pointer" : "not-allowed" }}
                >
                  {isArranging ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  )}
                </ControlButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <ControlButton title="Layout options">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                      </svg>
                    </ControlButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleTidyConnections}>
                      Tidy connections
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Controls>
            )}
          </ReactFlow>

          {!isMobileMode && (
            <CanvasMinimap
              nodes={nodes}
              reactFlow={reactFlow}
              containerRef={canvasContainerRef}
            />
          )}

          {isMobileMode && connectionState.mode === "connecting" && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-800/95 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 shadow-[0_16px_35px_-20px_rgba(15,23,42,0.45)] backdrop-blur">
              Tap target port, or tap outside to cancel
            </div>
          )}

          {isMobileMode && (
            <MobileBottomBar
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onFitView={handleFitView}
              onAddNote={handleAddNote}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              onLayoutMenu={() => setShowLayoutMenu(true)}
            />
          )}

          {inlinePopoverEnabled && (
            <InlinePopover
              selectedNodeId={state.selectedNodeId}
              nodes={nodes}
              onParamsChange={handlePopoverParamsChange}
              onDeleteNode={handlePopoverDeleteNode}
              validationErrors={state.validationErrors}
              onClose={handlePopoverClose}
              isMobileMode={isMobileMode}
            />
          )}
        </div>
      </div>

      {/* Mobile Layout Sheet (previously in page) */}
      <Sheet open={showLayoutMenu} onOpenChange={setShowLayoutMenu}>
        <SheetContent side="bottom" className="lg:hidden">
          <SheetHeader>
            <SheetTitle>Layout Options</SheetTitle>
            <SheetDescription>Rearrange and tidy your canvas layout.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            <Button
              onClick={handleAutoArrange}
              className="w-full"
              variant="outline"
              disabled={isArranging}
            >
              {isArranging ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Arranging…</>
              ) : (
                "Auto-arrange"
              )}
            </Button>
            <Button onClick={handleTidyConnections} className="w-full" variant="outline">
              Tidy connections
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </ReadinessProvider>
  );
}

export default function StrategyCanvas(props: StrategyCanvasProps) {
  return <CanvasInner {...props} />;
}
