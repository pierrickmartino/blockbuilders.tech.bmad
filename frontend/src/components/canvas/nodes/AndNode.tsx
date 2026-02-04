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
  const helpLink =
    typeof data?.helpLink === "string"
      ? data.helpLink
      : undefined;
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  const isCompact = typeof data?.isCompact === "boolean" ? data.isCompact : false;
  const isExpanded = typeof data?.isExpanded === "boolean" ? data.isExpanded : false;
  const summary = typeof data?.summary === "string" ? data.summary : undefined;
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="logic"
      blockType="and"
      hasError={hasError}
      validationMessage={validationMessage}
      helpLink={helpLink}
      isMobileMode={isMobileMode}
      isCompact={isCompact}
      isExpanded={isExpanded}
      summary={summary}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="a"
        style={{ top: "38%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-amber-500"
        )}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="b"
        style={{ top: "66%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-amber-500"
        )}
      />
      <div className="text-center text-sm font-mono font-bold text-gray-700">AND</div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-amber-500"
        )}
      />
    </BaseNode>
  );
}
