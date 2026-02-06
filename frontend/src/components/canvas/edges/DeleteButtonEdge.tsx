"use client";

import { MouseEvent } from "react";
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath, useReactFlow } from "@xyflow/react";

interface DeleteButtonEdgeData {
  showDeleteButton?: boolean;
}

export default function DeleteButtonEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const typedData = (data || {}) as DeleteButtonEdgeData;
  const showDeleteButton = typedData.showDeleteButton || selected;

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {showDeleteButton && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-auto absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <button
              type="button"
              aria-label="Delete connection"
              onClick={handleDelete}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 shadow-md transition hover:bg-rose-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
