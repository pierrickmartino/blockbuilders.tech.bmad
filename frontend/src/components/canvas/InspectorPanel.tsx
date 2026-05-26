"use client";

import { useCallback } from "react";
import { Node } from "@xyflow/react";
import { BlockType, getBlockMeta } from "@/types/canvas";
import { useCanvasState } from "@/context/CanvasStateContext";
import { useDisplay } from "@/context/display";
import { toast } from "sonner";
import ParameterForm from "./ParameterForm";

export default function InspectorPanel() {
  const { state, dispatch, flushSnapshot } = useCanvasState();
  const { isMobileCanvasMode: isMobileMode } = useDisplay();

  const selectedNode =
    state.nodes.find((n: Node) => n.id === state.selectedNodeId) ?? null;
  const validationErrors = state.validationErrors;

  const handleParamsChange = useCallback(
    (nodeId: string, params: Record<string, unknown>) => {
      const node = state.nodes.find((n: Node) => n.id === nodeId);
      const blockMeta = node ? getBlockMeta(node.type as BlockType) : undefined;
      dispatch({
        type: "SET_NODES",
        payload: state.nodes.map((n: Node) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  params,
                  label: blockMeta?.label || n.data?.label,
                },
              }
            : n
        ),
      });
      dispatch({ type: "SET_VALIDATION_ERRORS", payload: [] });
    },
    [state.nodes, dispatch]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const deletedNode = state.nodes.find((n: Node) => n.id === nodeId);
      const label = (deletedNode?.data?.label as string | undefined) ?? "Block";
      flushSnapshot();
      dispatch({ type: "DELETE_NODE", payload: nodeId });
      dispatch({ type: "DESELECT_ALL" });
      dispatch({ type: "SET_VALIDATION_ERRORS", payload: [] });
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

  if (!selectedNode) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-gray-900 p-4 text-center">
        <div className="space-y-2">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-gray-400 dark:text-gray-500" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No block selected</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Tap a block to view properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-gray-900">
      <ParameterForm
        node={selectedNode}
        onParamsChange={handleParamsChange}
        onDeleteNode={handleDeleteNode}
        validationErrors={validationErrors}
        isMobileMode={isMobileMode}
      />
    </div>
  );
}
