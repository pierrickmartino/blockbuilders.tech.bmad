import { Handle, Position, NodeProps } from "@xyflow/react";

export default function EntrySignalNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Entry Signal");
  return (
    <div
      className={`min-w-[120px] rounded-lg border-2 shadow-sm ${
        selected ? "border-green-500" : "border-green-300"
      } bg-green-50`}
    >
      <div className="rounded-t-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
        {label}
      </div>
      <div className="px-3 py-2">
        <Handle
          type="target"
          position={Position.Left}
          id="signal"
          className="!h-3 !w-3 !bg-green-500"
        />
        <div className="text-xs text-gray-600">Open Long</div>
      </div>
    </div>
  );
}
