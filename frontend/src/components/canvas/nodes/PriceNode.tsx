import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function PriceNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Price");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const params = (data?.params || {}) as { source?: string };
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="input"
      blockType="price"
      hasError={hasError}
      validationMessage={validationMessage}
    >
      <div className="text-xs text-gray-600">
        Source: {params.source || "close"}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!h-3 !w-3 !bg-purple-500"
      />
    </BaseNode>
  );
}
