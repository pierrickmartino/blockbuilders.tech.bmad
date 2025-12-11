import { Handle, Position, NodeProps } from "@xyflow/react";

export default function ExitSignalNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Exit Signal");
  return (
    <div
      className={`min-w-[120px] rounded-lg border-2 shadow-sm ${
        selected ? "border-red-500" : "border-red-300"
      } bg-red-50`}
    >
      <div className="rounded-t-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">
        {label}
      </div>
      <div className="px-3 py-2">
        <Handle
          type="target"
          position={Position.Left}
          id="signal"
          className="!h-3 !w-3 !bg-red-500"
        />
        <div className="text-xs text-gray-600">Close Position</div>
      </div>
    </div>
  );
}
