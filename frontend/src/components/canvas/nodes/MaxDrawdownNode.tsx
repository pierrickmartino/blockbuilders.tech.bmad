import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function MaxDrawdownNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Max Drawdown");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const helpLink =
    typeof data?.helpLink === "string"
      ? data.helpLink
      : undefined;
  const params = (data?.params || {}) as { percent?: number };
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="risk"
      blockType="max_drawdown"
      hasError={hasError}
      validationMessage={validationMessage}
      helpLink={helpLink}
      isMobileMode={isMobileMode}
    >
      <div className="text-xs text-gray-600">
        Max DD: {params.percent || 10}%
      </div>
    </BaseNode>
  );
}
