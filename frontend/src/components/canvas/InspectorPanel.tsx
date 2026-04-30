"use client";

import { Node } from "@xyflow/react";
import { ValidationError } from "@/types/canvas";
import ParameterForm from "./ParameterForm";

interface InspectorPanelProps {
  selectedNode: Node | null;
  onParamsChange: (nodeId: string, params: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  validationErrors: ValidationError[];
  isMobileMode?: boolean;
}

export default function InspectorPanel({
  selectedNode,
  onParamsChange,
  onDeleteNode,
  validationErrors,
  isMobileMode = false,
}: InspectorPanelProps) {
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
        onParamsChange={onParamsChange}
        onDeleteNode={onDeleteNode}
        validationErrors={validationErrors}
        isMobileMode={isMobileMode}
      />
    </div>
  );
}
