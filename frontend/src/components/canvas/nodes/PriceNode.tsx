import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function PriceNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Price");
  const params = (data?.params || {}) as { source?: string };
  return (
    <BaseNode label={label} selected={selected} category="input">
      <div className="text-xs text-gray-600">
        Source: {params.source || "close"}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!h-3 !w-3 !bg-purple-500"
      />
    </BaseNode>
  );
}
