import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { cn } from "@/lib/utils";

export default function StochasticNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Stochastic");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const helpLink =
    typeof data?.helpLink === "string" ? data.helpLink : undefined;
  const params = (data?.params || {}) as {
    k_period?: number;
    d_period?: number;
    smooth?: number;
  };
  const isMobileMode =
    typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;

  return (
    <BaseNode
      label={label}
      selected={selected}
      category="indicator"
      blockType="stochastic"
      hasError={hasError}
      validationMessage={validationMessage}
      helpLink={helpLink}
      isMobileMode={isMobileMode}
    >
      <div className="space-y-0.5 text-xs text-gray-600">
        <div>%K Period: {params.k_period || 14}</div>
        <div>%D Period: {params.d_period || 3}</div>
        <div>Smooth: {params.smooth || 3}</div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="k"
        style={{ top: "40%" }}
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-blue-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="d"
        style={{ top: "70%" }}
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-blue-500"
        )}
      />
    </BaseNode>
  );
}
