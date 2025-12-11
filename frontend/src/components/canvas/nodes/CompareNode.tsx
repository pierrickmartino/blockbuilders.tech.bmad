import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function CompareNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Compare");
  const params = (data?.params || {}) as { operator?: string };
  return (
    <BaseNode label={label} selected={selected} category="logic">
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ top: "35%" }}
        className="!h-3 !w-3 !bg-amber-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="right"
        style={{ top: "65%" }}
        className="!h-3 !w-3 !bg-amber-500"
      />
      <div className="text-center text-sm font-mono font-bold text-gray-700">
        {params.operator || ">"}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!h-3 !w-3 !bg-amber-500"
      />
    </BaseNode>
  );
}
