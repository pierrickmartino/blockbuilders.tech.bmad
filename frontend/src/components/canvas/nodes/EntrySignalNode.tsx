import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { cn } from "@/lib/utils";

export default function EntrySignalNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Entry Signal");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  return (
    <BaseNode
      label={label}
      selected={selected}
      category="signal"
      blockType="entry_signal"
      hasError={hasError}
      validationMessage={validationMessage}
      isMobileMode={isMobileMode}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="signal"
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-green-500"
        )}
      />
      <div className="text-xs text-gray-600">Buy when signal is true</div>
    </BaseNode>
  );
}
