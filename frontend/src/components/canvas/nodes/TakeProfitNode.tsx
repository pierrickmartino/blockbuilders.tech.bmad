import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function TakeProfitNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Take Profit");
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
    levels?: Array<{
      percent?: number;
      ratio?: number;
      profit_pct?: number;
      close_pct?: number;
    }>;
    take_profit_pct?: number;
  };
  const levels =
    Array.isArray(params.levels) && params.levels.length > 0
      ? params.levels.map((level) => ({
          percent: level.percent ?? level.profit_pct ?? 5,
          ratio: level.ratio ?? level.close_pct ?? 100,
        }))
      : typeof params.take_profit_pct === "number"
        ? [{ percent: params.take_profit_pct, ratio: 100 }]
        : [{ percent: 5, ratio: 100 }];
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  const isCompact = typeof data?.isCompact === "boolean" ? data.isCompact : false;
  const isExpanded = typeof data?.isExpanded === "boolean" ? data.isExpanded : false;
  const summary = typeof data?.summary === "string" ? data.summary : undefined;

  return (
    <BaseNode
      label={label}
      selected={selected}
      category="risk"
      blockType="take_profit"
      hasError={hasError}
      validationMessage={validationMessage}
      helpLink={helpLink}
      isMobileMode={isMobileMode}
      isCompact={isCompact}
      isExpanded={isExpanded}
      summary={summary}
    >
      <div className="space-y-0.5 text-xs text-gray-600">
        {levels.map((level, i) => (
          <div key={i}>
            Level {i + 1}: {level.percent}% @ {level.ratio}%
          </div>
        ))}
      </div>
    </BaseNode>
  );
}
