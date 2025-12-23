import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function MaxDrawdownNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Max Drawdown");
  const params = (data?.params || {}) as { max_drawdown_pct?: number };
  return (
    <BaseNode label={label} selected={selected} category="risk">
      <div className="text-xs text-gray-600">
        Max DD: {params.max_drawdown_pct || 10}%
      </div>
    </BaseNode>
  );
}
