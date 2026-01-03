import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function ConstantNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Constant");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const params = (data?.params || {}) as { value?: number };
  const value = params.value ?? 0;

  return (
    <BaseNode
      label={label}
      selected={selected}
      category="input"
      blockType="constant"
      hasError={hasError}
      validationMessage={validationMessage}
    >
      <div className="text-xs text-gray-600">Value: {value}</div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!h-3 !w-3 !bg-purple-500"
      />
    </BaseNode>
  );
}
