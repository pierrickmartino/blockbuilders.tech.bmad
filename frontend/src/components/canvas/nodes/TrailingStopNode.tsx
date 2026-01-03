import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function TrailingStopNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Trailing Stop");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const params = (data?.params || {}) as { trail_pct?: number };
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="risk"
      blockType="trailing_stop"
      hasError={hasError}
      validationMessage={validationMessage}
    >
      <div className="text-xs text-gray-600">
        Trail: -{params.trail_pct || 5}%
      </div>
    </BaseNode>
  );
}
