import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function ExitSignalNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Exit Signal");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage = typeof data?.validationMessage === "string" ? data.validationMessage : undefined;

  return (
    <BaseNode
      label={label}
      selected={selected}
      category="risk"
      blockType="exit_signal"
      hasError={hasError}
      validationMessage={validationMessage}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="signal"
        className="!h-3 !w-3 !bg-red-500"
      />
      <div className="text-xs text-gray-600">Close Position</div>
    </BaseNode>
  );
}
