import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function TimeExitNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Time Exit");
  const params = (data?.params || {}) as { bars?: number };
  return (
    <BaseNode label={label} selected={selected} category="risk">
      <div className="text-xs text-gray-600">
        Exit: {params.bars || 10} bars
      </div>
    </BaseNode>
  );
}
