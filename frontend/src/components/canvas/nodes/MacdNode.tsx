import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { cn } from "@/lib/utils";
import { PriceSource } from "@/types/canvas";

export default function MacdNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "MACD");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const helpLink =
    typeof data?.helpLink === "string"
      ? data.helpLink
      : undefined;
  const params = (data?.params || {}) as {
    source?: PriceSource;
    fast_period?: number;
    slow_period?: number;
    signal_period?: number;
  };
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="indicator"
      blockType="macd"
      hasError={hasError}
      validationMessage={validationMessage}
      helpLink={helpLink}
      isMobileMode={isMobileMode}
    >
      <div className="space-y-0.5 text-xs text-gray-600">
        <div>Source: {params.source || "close"}</div>
        <div>Fast: {params.fast_period || 12}</div>
        <div>Slow: {params.slow_period || 26}</div>
        <div>Signal: {params.signal_period || 9}</div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="macd"
        style={{ top: "30%" }}
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="signal"
        style={{ top: "55%" }}
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="histogram"
        style={{ top: "80%" }}
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-blue-500"
        )}
      />
    </BaseNode>
  );
}
