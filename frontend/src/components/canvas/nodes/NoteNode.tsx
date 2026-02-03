import { NodeProps } from "@xyflow/react";
import BaseNode from "../BaseNode";

export default function NoteNode({ data, selected }: NodeProps) {
  const label = String(data?.label || "Note");
  const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
  const validationMessage =
    typeof data?.validationMessage === "string"
      ? data.validationMessage
      : undefined;
  const helpLink =
    typeof data?.helpLink === "string"
      ? data.helpLink
      : undefined;
  const params = (data?.params || {}) as { text?: string };
  const isMobileMode = typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
  const isCompact = typeof data?.isCompact === "boolean" ? data.isCompact : false;
  const isExpanded = typeof data?.isExpanded === "boolean" ? data.isExpanded : false;
  const summary = typeof data?.summary === "string" ? data.summary : undefined;

  return (
    <BaseNode
      label={label}
      selected={selected}
      category="input"
      hasError={hasError}
      validationMessage={validationMessage}
      helpLink={helpLink}
      isMobileMode={isMobileMode}
      isCompact={isCompact}
      isExpanded={isExpanded}
      summary={summary}
    >
      <div className="max-w-[200px] text-xs italic text-gray-600">
        {params.text || "Add your notes here..."}
      </div>
    </BaseNode>
  );
}
