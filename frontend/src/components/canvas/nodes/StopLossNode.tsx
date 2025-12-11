import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function StopLossNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Stop Loss");
  const params = (data?.params || {}) as { stop_loss_pct?: number };
  return (
    <BaseNode label={label} selected={selected} category="risk">
      <div className="text-xs text-gray-600">
        Stop: -{params.stop_loss_pct || 5}%
      </div>
    </BaseNode>
  );
}
