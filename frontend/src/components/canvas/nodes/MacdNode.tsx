import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function MacdNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "MACD");
  const params = (data?.params || {}) as {
    fast_period?: number;
    slow_period?: number;
    signal_period?: number;
  };
  return (
    <BaseNode label={label} selected={selected} category="indicator">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!h-3 !w-3 !bg-blue-500"
      />
      <div className="space-y-0.5 text-xs text-gray-600">
        <div>Fast: {params.fast_period || 12}</div>
        <div>Slow: {params.slow_period || 26}</div>
        <div>Signal: {params.signal_period || 9}</div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="macd"
        style={{ top: "35%" }}
        className="!h-3 !w-3 !bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="signal"
        style={{ top: "55%" }}
        className="!h-3 !w-3 !bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="histogram"
        style={{ top: "75%" }}
        className="!h-3 !w-3 !bg-blue-500"
      />
    </BaseNode>
  );
}
