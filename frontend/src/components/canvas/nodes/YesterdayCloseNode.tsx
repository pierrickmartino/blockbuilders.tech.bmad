import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function YesterdayCloseNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Yesterday Close");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="input"
      blockType="yesterday_close"
      hasError={hasError}
      validationMessage={validationMessage}
    >
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
