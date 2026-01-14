import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function TrailingStopNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Trailing Stop");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const params = (data?.params || {}) as { percent?: number };
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="risk"
      blockType="trailing_stop"
      hasError={hasError}
      validationMessage={validationMessage}
      isMobileMode={isMobileMode}
    >
      <div className="text-xs text-gray-600">
        Trail: {params.percent || 3}%
      </div>
    </BaseNode>
  );
}
