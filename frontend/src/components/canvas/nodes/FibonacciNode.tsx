import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { cn } from "@/lib/utils";

export default function FibonacciNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Fibonacci");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const helpLink =
    typeof data?.helpLink === "string" ? data.helpLink : undefined;
  const params = (data?.params || {}) as { lookback?: number };
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
      blockType="fibonacci"
      hasError={hasError}
      validationMessage={validationMessage}
      helpLink={helpLink}
      isMobileMode={isMobileMode}
      isCompact={isCompact}
      isExpanded={isExpanded}
      summary={summary}
    >
      <div className="space-y-0.5 text-xs text-gray-600">
        <div>Lookback: {params.lookback || 50}</div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="level_236"
        style={{ top: "22%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="level_382"
        style={{ top: "37%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="level_5"
        style={{ top: "52%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="level_618"
        style={{ top: "67%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="level_786"
        style={{ top: "82%" }}
        className={cn(
          isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]",
          "!bg-blue-500"
        )}
      />
    </BaseNode>
  );
}
