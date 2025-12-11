import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function CrossoverNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Crossover");
  const params = (data?.params || {}) as { direction?: string };
  const direction = params.direction || "crosses_above";
  const displayText = direction === "crosses_above" ? "Crosses Above" : "Crosses Below";
  return (
    <BaseNode label={label} selected={selected} category="logic">
      <Handle
        type="target"
        position={Position.Left}
        id="fast"
        style={{ top: "35%" }}
        className="!h-3 !w-3 !bg-amber-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="slow"
        style={{ top: "65%" }}
        className="!h-3 !w-3 !bg-amber-500"
      />
      <div className="text-xs text-gray-600">{displayText}</div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!h-3 !w-3 !bg-amber-500"
      />
    </BaseNode>
  );
}
