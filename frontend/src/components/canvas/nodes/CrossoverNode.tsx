import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { cn } from "@/lib/utils";

export default function CrossoverNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Crossover");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const helpLink =
    typeof data?.helpLink === "string"
      ? data.helpLink
      : undefined;
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="logic"
      blockType="crossover"
      hasError={hasError}
      validationMessage={validationMessage}
      helpLink={helpLink}
      isMobileMode={isMobileMode}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="fast"
        style={{ top: "35%" }}
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-amber-500"
        )}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="slow"
        style={{ top: "65%" }}
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-amber-500"
        )}
      />
      <div className="text-xs text-gray-600">Fast × Slow</div>
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
