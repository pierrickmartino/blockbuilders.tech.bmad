import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function TrailingStopNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Trailing Stop");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const params = (data?.params || {}) as { trail_pct?: number; percent?: number };
  const trailPct = typeof params.trail_pct === "number" ? params.trail_pct : params.percent;
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
        Trail: {trailPct ?? 3}%
      </div>
    </BaseNode>
  );
}
