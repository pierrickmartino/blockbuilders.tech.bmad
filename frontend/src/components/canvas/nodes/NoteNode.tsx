import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function NoteNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Note");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const params = (data?.params || {}) as { text?: string };
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;

  return (
    <BaseNode
      label={label}
      selected={selected}
      category="input"
      hasError={hasError}
      validationMessage={validationMessage}
      isMobileMode={isMobileMode}
    >
      <div className="max-w-[200px] text-xs italic text-gray-600">
        {params.text || "Add your notes here..."}
      </div>
    </BaseNode>
  );
}
