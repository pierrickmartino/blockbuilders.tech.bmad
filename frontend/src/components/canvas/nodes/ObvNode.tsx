import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";
import { cn } from "@/lib/utils";

export default function ObvNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "OBV");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const helpLink =
    typeof data?.helpLink === "string" ? data.helpLink : undefined;
  const isMobileMode =
    typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;

  return (
    <BaseNode
      label={label}
      selected={selected}
      category="indicator"
      blockType="obv"
      hasError={hasError}
      validationMessage={validationMessage}
      helpLink={helpLink}
      isMobileMode={isMobileMode}
    >
      <div className="text-xs text-gray-600">Cumulative volume</div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={cn(
          isMobileMode ? "!h-5 !w-5" : "!h-3 !w-3",
          "!bg-blue-500"
        )}
      />
    </BaseNode>
  );
}
