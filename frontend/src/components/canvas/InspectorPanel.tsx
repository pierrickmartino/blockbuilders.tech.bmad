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
          <div className="mx-auto h-12 w-12 flex items-center justify-center text-4xl text-gray-300 dark:text-gray-600">
            📦
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
