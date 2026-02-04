import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { cn } from "@/lib/utils";

export default function AdxNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "ADX");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const helpLink =
    typeof data?.helpLink === "string" ? data.helpLink : undefined;
  const params = (data?.params || {}) as { period?: number };
  const isMobileMode =
    typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  const isCompact = typeof data?.isCompact === "boolean" ? data.isCompact : false;
  const isExpanded = typeof data?.isExpanded === "boolean" ? data.isExpanded : false;
  const summary = typeof data?.summary === "string" ? data.summary : undefined;

  return (
    <BaseNode
      label={label}
      selected={selected}
      category="indicator"
      blockType="adx"
      hasError={hasError}
      validationMessage={validationMessage}
      helpLink={helpLink}
      isMobileMode={isMobileMode}
      isCompact={isCompact}
      isExpanded={isExpanded}
      summary={summary}
    >
      <div className="space-y-0.5 text-xs text-gray-600">
        <div>Period: {params.period || 14}</div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="adx"
        style={{ top: "32%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="plus_di"
        style={{ top: "52%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="minus_di"
        style={{ top: "72%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-blue-500"
        )}
      />
    </BaseNode>
  );
}
