import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function YesterdayCloseNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Yesterday Close");
  return (
    <BaseNode label={label} selected={selected} category="input">
      <div className="text-xs text-gray-600">Previous candle close</div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!h-3 !w-3 !bg-purple-500"
      />
    </BaseNode>
  );
}
