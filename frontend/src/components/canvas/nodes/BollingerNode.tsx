import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { cn } from "@/lib/utils";
import { PriceSource } from "@/types/canvas";

export default function BollingerNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Bollinger Bands");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const helpLink =
    typeof data?.helpLink === "string"
      ? data.helpLink
      : undefined;
  const params = (data?.params || {}) as { source?: PriceSource; period?: number; stddev?: number };
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  const isCompact = typeof data?.isCompact === "boolean" ? data.isCompact : false;
  const isExpanded = typeof data?.isExpanded === "boolean" ? data.isExpanded : false;
  const summary = typeof data?.summary === "string" ? data.summary : undefined;
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="indicator"
      blockType="bollinger"
      hasError={hasError}
      validationMessage={validationMessage}
      helpLink={helpLink}
      isMobileMode={isMobileMode}
      isCompact={isCompact}
      isExpanded={isExpanded}
      summary={summary}
    >
      <div className="space-y-0.5 text-xs text-gray-600">
        <div>Source: {params.source || "close"}</div>
        <div>Period: {params.period || 20}</div>
        <div>StdDev: {params.stddev || 2}</div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="upper"
        style={{ top: "32%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="middle"
        style={{ top: "52%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="lower"
        style={{ top: "72%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-blue-500"
        )}
      />
    </BaseNode>
  );
}
