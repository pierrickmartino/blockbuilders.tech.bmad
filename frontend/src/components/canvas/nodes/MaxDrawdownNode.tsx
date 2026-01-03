import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function MaxDrawdownNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Max Drawdown");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const params = (data?.params || {}) as { max_drawdown_pct?: number };
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="risk"
      blockType="max_drawdown"
      hasError={hasError}
      validationMessage={validationMessage}
    >
      <div className="text-xs text-gray-600">
        Max DD: {params.max_drawdown_pct || 10}%
      </div>
    </BaseNode>
  );
}
