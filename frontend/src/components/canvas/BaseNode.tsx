import { ReactNode } from "react";
import InfoIcon from "@/components/InfoIcon";
import { blockToGlossaryId, getTooltip } from "@/lib/tooltip-content";

interface BaseNodeProps {
  label: string;
  selected: boolean;
  category: "input" | "indicator" | "logic" | "signal" | "risk";
  children?: ReactNode;
  hasError?: boolean;
  blockType?: string;
}

const categoryStyles = {
  input: {
    border: "border-purple-300",
    borderSelected: "border-purple-500",
    bg: "bg-purple-50",
    header: "bg-purple-100 text-purple-700",
  },
  indicator: {
    border: "border-blue-300",
    borderSelected: "border-blue-500",
    bg: "bg-blue-50",
    header: "bg-blue-100 text-blue-700",
  },
  logic: {
    border: "border-amber-300",
    borderSelected: "border-amber-500",
    bg: "bg-amber-50",
    header: "bg-amber-100 text-amber-700",
  },
  signal: {
    border: "border-green-300",
    borderSelected: "border-green-500",
    bg: "bg-green-50",
    header: "bg-green-100 text-green-700",
  },
  risk: {
    border: "border-red-300",
    borderSelected: "border-red-500",
    bg: "bg-red-50",
    header: "bg-red-100 text-red-700",
  },
};

export default function BaseNode({
  label,
  selected,
  category,
  children,
  hasError,
  blockType,
}: BaseNodeProps) {
  const styles = categoryStyles[category];
  const borderClass = selected ? styles.borderSelected : styles.border;
  const errorBorder = hasError ? "border-red-500 ring-2 ring-red-200" : "";
  const tooltip = blockType ? getTooltip(blockToGlossaryId(blockType)) : null;

  return (
    <div
      className={`min-w-[120px] rounded-lg border-2 shadow-sm ${borderClass} ${styles.bg} ${errorBorder}`}
    >
      <div
        className={`flex items-center justify-between gap-1 rounded-t-md px-3 py-1.5 text-xs font-semibold ${styles.header}`}
        title={tooltip?.short}
      >
        <span>{label}</span>
        {blockType && (
          <InfoIcon
            glossaryId={blockToGlossaryId(blockType)}
            className="flex-shrink-0"
          />
        )}
      </div>
      {children && <div className="px-3 py-2">{children}</div>}
    </div>
  );
}
