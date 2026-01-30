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
    >
      <div className="space-y-0.5 text-xs text-gray-600">
        <div>Period: {params.period || 14}</div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="adx"
        style={{ top: "30%" }}
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="plus_di"
        style={{ top: "55%" }}
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="minus_di"
        style={{ top: "80%" }}
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-blue-500"
        )}
      />
    </BaseNode>
  );
}
