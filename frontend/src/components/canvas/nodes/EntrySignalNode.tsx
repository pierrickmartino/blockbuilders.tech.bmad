import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function EntrySignalNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Entry Signal");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage = typeof data?.validationMessage === "string" ? data.validationMessage : undefined;

  return (
    <BaseNode
      label={label}
      selected={selected}
      category="signal"
      blockType="entry_signal"
      hasError={hasError}
      validationMessage={validationMessage}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="signal"
        className="!h-3 !w-3 !bg-green-500"
      />
      <div className="text-xs text-gray-600">Open Long</div>
    </BaseNode>
  );
}
