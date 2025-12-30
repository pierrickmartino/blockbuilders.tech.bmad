import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function PositionSizeNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Position Size");
  const params = (data?.params || {}) as { value?: number };
  return (
    <BaseNode label={label} selected={selected} category="risk" blockType="position_size">
      <div className="text-xs text-gray-600">
        {params.value || 5}% of equity
      </div>
    </BaseNode>
  );
}
