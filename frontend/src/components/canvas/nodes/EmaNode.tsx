import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { cn } from "@/lib/utils";
import { PriceSource } from "@/types/canvas";

export default function EmaNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "EMA");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const params = (data?.params || {}) as { source?: PriceSource; period?: number };
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="indicator"
      blockType="ema"
      hasError={hasError}
      validationMessage={validationMessage}
      isMobileMode={isMobileMode}
    >
      <div className="space-y-0.5 text-xs text-gray-600">
        <div>Source: {params.source || "close"}</div>
        <div>Period: {params.period || 20}</div>
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
