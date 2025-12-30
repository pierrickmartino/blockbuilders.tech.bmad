import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function OrNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "OR");
  return (
    <BaseNode label={label} selected={selected} category="logic" blockType="or">
      <Handle
        type="target"
        position={Position.Left}
        id="a"
        style={{ top: "35%" }}
        className="!h-3 !w-3 !bg-amber-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="b"
        style={{ top: "65%" }}
        className="!h-3 !w-3 !bg-amber-500"
      />
      <div className="text-center text-sm font-bold text-gray-700">||</div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!h-3 !w-3 !bg-amber-500"
      />
    </BaseNode>
  );
}
