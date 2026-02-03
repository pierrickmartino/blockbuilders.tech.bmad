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
  const params = (data?.params || {}) as {
    percent?: number;
    max_drawdown_pct?: number;
  };
  const maxDrawdown = params.max_drawdown_pct ?? params.percent ?? 10;
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  const isCompact = typeof data?.isCompact === "boolean" ? data.isCompact : false;
  const isExpanded = typeof data?.isExpanded === "boolean" ? data.isExpanded : false;
  const summary = typeof data?.summary === "string" ? data.summary : undefined;
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
      isCompact={isCompact}
      isExpanded={isExpanded}
      summary={summary}
    >
      <div className="text-xs text-gray-600">
        Max DD: {maxDrawdown}%
      </div>
    </BaseNode>
  );
}
