import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { cn } from "@/lib/utils";

export default function AndNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "AND");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="logic"
      blockType="and"
      hasError={hasError}
      validationMessage={validationMessage}
      isMobileMode={isMobileMode}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="a"
        style={{ top: "35%" }}
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-amber-500"
        )}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="b"
        style={{ top: "65%" }}
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-amber-500"
        )}
      />
      <div className="text-center text-sm font-mono font-bold text-gray-700">AND</div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-amber-500"
        )}
      />
    </BaseNode>
  );
}
