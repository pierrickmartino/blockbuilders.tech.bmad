import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function BollingerNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Bollinger Bands");
  const params = (data?.params || {}) as { period?: number; stddev?: number };
  return (
    <BaseNode label={label} selected={selected} category="indicator">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!h-3 !w-3 !bg-blue-500"
      />
      <div className="space-y-0.5 text-xs text-gray-600">
        <div>Period: {params.period || 20}</div>
        <div>StdDev: {params.stddev || 2}</div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="upper"
        style={{ top: "35%" }}
        className="!h-3 !w-3 !bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="middle"
        style={{ top: "55%" }}
        className="!h-3 !w-3 !bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="lower"
        style={{ top: "75%" }}
        className="!h-3 !w-3 !bg-blue-500"
      />
    </BaseNode>
  );
}
