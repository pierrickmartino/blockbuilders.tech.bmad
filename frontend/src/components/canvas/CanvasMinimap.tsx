"use client";

import { RefObject, useMemo } from "react";
import { Node, ReactFlowInstance, useStore } from "@xyflow/react";
import type { CanvasEdge } from "@/components/canvas/StrategyCanvas";
import { getBlockMeta, BlockType } from "@/types/canvas";

interface CanvasMinimapProps {
  nodes: Node[];
  reactFlow: ReactFlowInstance<Node, CanvasEdge>;
  containerRef?: RefObject<HTMLDivElement | null>;
  isMobileMode?: boolean;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;
const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const PADDING = 50;

function getCanvasBounds(nodes: Node[]): Bounds | null {
  if (nodes.length === 0) return null;

  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  nodes.forEach((node) => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + NODE_WIDTH);
    maxY = Math.max(maxY, node.position.y + NODE_HEIGHT);
  });

  return {
    x: minX - PADDING,
    y: minY - PADDING,
    width: maxX - minX + 2 * PADDING,
    height: maxY - minY + 2 * PADDING,
  };
}

function getCategoryColor(blockType: string): string {
  const meta = getBlockMeta(blockType as BlockType);
  const categoryColors = {
    input: "#9333ea", // purple-600
    indicator: "#2563eb", // blue-600
    logic: "#d97706", // amber-600
    signal: "#16a34a", // green-600
    risk: "#dc2626", // red-600
  };
  return categoryColors[meta?.category || "input"];
}

function getViewportRect(
  reactFlow: ReactFlowInstance<Node, CanvasEdge>,
  canvasBounds: Bounds,
  minimapWidth: number,
  minimapHeight: number,
  containerRef?: RefObject<HTMLDivElement | null>
): Rect {
  const viewport = reactFlow.getViewport();

  // Container dimensions (visible area)
  const container = containerRef?.current;
  const containerWidth = container?.clientWidth ?? window.innerWidth;
  const containerHeight = container?.clientHeight ?? window.innerHeight;

  // Visible area in canvas coordinates
  const visibleX = -viewport.x / viewport.zoom;
  const visibleY = -viewport.y / viewport.zoom;
  const visibleWidth = containerWidth / viewport.zoom;
  const visibleHeight = containerHeight / viewport.zoom;

  // Scale factors (canvas → minimap)
  const scaleX = minimapWidth / canvasBounds.width;
  const scaleY = minimapHeight / canvasBounds.height;

  // Map to minimap coordinates
  return {
    x: (visibleX - canvasBounds.x) * scaleX,
    y: (visibleY - canvasBounds.y) * scaleY,
    width: visibleWidth * scaleX,
    height: visibleHeight * scaleY,
  };
}

function findSectionCenter(
  nodes: Node[],
  filterFn: (node: Node) => boolean
): { x: number; y: number } | null {
  const sectionNodes = nodes.filter(filterFn);

  if (sectionNodes.length === 0) return null;

  // Calculate centroid
  const sumX = sectionNodes.reduce((sum, n) => sum + n.position.x, 0);
  const sumY = sectionNodes.reduce((sum, n) => sum + n.position.y, 0);

  return {
    x: sumX / sectionNodes.length,
    y: sumY / sectionNodes.length,
  };
}

export function CanvasMinimap({
  nodes,
  reactFlow,
  containerRef,
  isMobileMode = false,
}: CanvasMinimapProps) {
  // Calculate all derived values first (hooks must come before early returns)
  const canvasBounds = useMemo(() => getCanvasBounds(nodes), [nodes]);
  const transform = useStore((state) => state.transform);

  // Section detection
  const entryCenter = useMemo(
    () => findSectionCenter(nodes, (n) => n.type === "entry_signal"),
    [nodes]
  );

  const EXIT_TYPES = useMemo(
    () => [
      "exit_signal",
      "time_exit",
      "trailing_stop",
      "stop_loss",
      "take_profit",
      "max_drawdown",
    ],
    []
  );

  const exitCenter = useMemo(
    () =>
      findSectionCenter(nodes, (n) => EXIT_TYPES.includes(n.type as string)),
    [nodes, EXIT_TYPES]
  );

  const riskCenter = useMemo(
    () =>
      findSectionCenter(nodes, (n) => {
        const meta = getBlockMeta(n.type as BlockType);
        return meta?.category === "risk";
      }),
    [nodes]
  );

  // Early return after all hooks
  if (!canvasBounds) {
    return null;
  }

  // Scale factors for mapping canvas coordinates to minimap
  const scaleX = MINIMAP_WIDTH / canvasBounds.width;
  const scaleY = MINIMAP_HEIGHT / canvasBounds.height;

  // Calculate viewport rectangle (transform subscription triggers recalculation)
  const viewportRect = getViewportRect(
    reactFlow,
    canvasBounds,
    MINIMAP_WIDTH,
    MINIMAP_HEIGHT,
    containerRef
  );

  // Suppress unused variable warnings - these are used for triggering re-renders
  void isMobileMode;
  void transform;

  // Navigation handler
  const jumpToSection = (center: { x: number; y: number }) => {
    reactFlow.setCenter(center.x, center.y, {
      zoom: 1.0,
      duration: 400,
    });
  };

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-white/90 backdrop-blur-sm shadow-[0_16px_35px_-20px_rgba(15,23,42,0.45)] p-3 dark:border-slate-700 dark:bg-slate-900/90">
      <svg
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="rounded-lg bg-slate-50 dark:bg-slate-800"
      >
        {/* Render node dots (color-coded by category) */}
        {nodes.map((node) => {
          const x = (node.position.x - canvasBounds.x) * scaleX;
          const y = (node.position.y - canvasBounds.y) * scaleY;
          const color = getCategoryColor(node.type as string);

          return (
            <circle
              key={node.id}
              cx={x}
              cy={y}
              r={2.5}
              fill={color}
              opacity={0.7}
            />
          );
        })}

        {/* Viewport indicator */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.width}
          height={viewportRect.height}
          fill="rgba(99, 102, 241, 0.1)"
          stroke="#6366f1"
          strokeWidth={1.5}
          rx={2}
        />
      </svg>
      <div className="flex gap-1 justify-between">
        <button
          onClick={() => entryCenter && jumpToSection(entryCenter)}
          disabled={!entryCenter}
          className="h-8 px-2 text-xs rounded-lg bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Entry
        </button>
        <button
          onClick={() => exitCenter && jumpToSection(exitCenter)}
          disabled={!exitCenter}
          className="h-8 px-2 text-xs rounded-lg bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Exit
        </button>
        <button
          onClick={() => riskCenter && jumpToSection(riskCenter)}
          disabled={!riskCenter}
          className="h-8 px-2 text-xs rounded-lg bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Risk
        </button>
      </div>
    </div>
  );
}
