import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function TrailingStopNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Trailing Stop");
  const params = (data?.params || {}) as { trail_pct?: number };
  return (
    <BaseNode label={label} selected={selected} category="risk" blockType="trailing_stop">
      <div className="text-xs text-gray-600">
        Trail: -{params.trail_pct || 5}%
      </div>
    </BaseNode>
  );
}
