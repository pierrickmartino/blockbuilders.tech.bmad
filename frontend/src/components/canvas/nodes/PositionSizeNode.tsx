import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function PositionSizeNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Position Size");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const params = (data?.params || {}) as { value?: number };
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="risk"
      blockType="position_size"
      hasError={hasError}
      validationMessage={validationMessage}
    >
      <div className="text-xs text-gray-600">
        {params.value || 5}% of equity
      </div>
    </BaseNode>
  );
}
