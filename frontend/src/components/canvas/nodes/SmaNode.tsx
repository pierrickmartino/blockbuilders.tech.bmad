import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { cn } from "@/lib/utils";

export default function SmaNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "SMA");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const params = (data?.params || {}) as { period?: number };
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="indicator"
      blockType="sma"
      hasError={hasError}
      validationMessage={validationMessage}
      isMobileMode={isMobileMode}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-blue-500"
        )}
      />
      <div className="text-xs text-gray-600">
        Period: {params.period || 20}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-blue-500"
        )}
      />
    </BaseNode>
  );
}
