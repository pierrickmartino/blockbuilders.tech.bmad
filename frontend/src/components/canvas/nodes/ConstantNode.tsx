import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { cn } from "@/lib/utils";

export default function ConstantNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Constant");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const helpLink =
    typeof data?.helpLink === "string"
      ? data.helpLink
      : undefined;
  const params = (data?.params || {}) as { value?: number };
  const value = params.value ?? 0;
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;

  return (
    <BaseNode
      label={label}
      selected={selected}
      category="input"
      blockType="constant"
      hasError={hasError}
      validationMessage={validationMessage}
      helpLink={helpLink}
      isMobileMode={isMobileMode}
    >
      <div className="text-xs text-gray-600">Value: {value}</div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-purple-500"
        )}
      />
    </BaseNode>
  );
}
