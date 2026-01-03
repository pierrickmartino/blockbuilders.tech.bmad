import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function StopLossNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Stop Loss");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const params = (data?.params || {}) as { stop_loss_pct?: number };
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="risk"
      blockType="stop_loss"
      hasError={hasError}
      validationMessage={validationMessage}
    >
      <div className="text-xs text-gray-600">
        Stop: -{params.stop_loss_pct || 5}%
      </div>
    </BaseNode>
  );
}
