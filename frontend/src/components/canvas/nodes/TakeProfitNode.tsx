import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function TakeProfitNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Take Profit");
  const params = (data?.params || {}) as { take_profit_pct?: number };
  return (
    <BaseNode label={label} selected={selected} category="risk">
      <div className="text-xs text-gray-600">
        Target: +{params.take_profit_pct || 10}%
      </div>
    </BaseNode>
  );
}
