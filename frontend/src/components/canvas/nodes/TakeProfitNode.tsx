import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { TakeProfitLevel } from "@/types/canvas";

interface TakeProfitNodeParams {
  levels?: TakeProfitLevel[];
  take_profit_pct?: number; // Legacy format
}

export default function TakeProfitNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Take Profit");
  const params = (data?.params || {}) as TakeProfitNodeParams;

  // Support both legacy (take_profit_pct) and new (levels) format
  let levels: TakeProfitLevel[];
  if (params.levels && params.levels.length > 0) {
    levels = params.levels;
  } else if (params.take_profit_pct !== undefined) {
    levels = [{ profit_pct: params.take_profit_pct, close_pct: 100 }];
  } else {
    levels = [{ profit_pct: 10, close_pct: 100 }];
  }

  // Format display based on number of levels
  const displayText =
    levels.length === 1
      ? `TP +${levels[0].profit_pct}% / Close ${levels[0].close_pct}%`
      : `TP x${levels.length}: ${levels.map((l) => `${l.profit_pct}/${l.close_pct}`).join(", ")}`;

  return (
    <BaseNode label={label} selected={selected} category="risk">
      <div className="text-xs text-gray-600">{displayText}</div>
    </BaseNode>
  );
}
