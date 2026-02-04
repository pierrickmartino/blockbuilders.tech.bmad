import { ReactNode, Children, isValidElement } from "react";
import { Handle } from "@xyflow/react";
import InfoIcon from "@/components/InfoIcon";
import { blockToGlossaryId, getTooltip } from "@/lib/tooltip-content";
import { cn } from "@/lib/utils";

interface BaseNodeProps {
  id?: string;
  label: string;
  selected: boolean;
  category: "input" | "indicator" | "logic" | "signal" | "risk";
  children?: ReactNode;
  hasError?: boolean;
  blockType?: string;
  validationMessage?: string;
  helpLink?: string;
  isMobileMode?: boolean;
  isCompact?: boolean;
  isExpanded?: boolean;
  summary?: string;
}

// Helper function to separate React Flow Handles from other content
function separateHandlesAndContent(children: ReactNode) {
  const childArray = Children.toArray(children);
  const handles: ReactNode[] = [];
  const content: ReactNode[] = [];

  childArray.forEach(child => {
    if (
      isValidElement(child) &&
      child.type === Handle
    ) {
      handles.push(child);
    } else {
      content.push(child);
    }
  });

  return { handles, content };
}

const categoryStyles = {
  input: {
    border: "border-slate-200/90",
    borderSelected: "border-violet-300",
    bg: "bg-gradient-to-br from-white via-slate-50/95 to-violet-50/55",
    header:
      "bg-gradient-to-r from-violet-500/12 via-violet-400/7 to-transparent text-slate-700",
    glow: "shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)]",
    selectedGlow: "shadow-[0_24px_48px_-30px_rgba(109,40,217,0.6)]",
  },
  indicator: {
    border: "border-slate-200/90",
    borderSelected: "border-sky-300",
    bg: "bg-gradient-to-br from-white via-slate-50/95 to-sky-50/55",
    header:
      "bg-gradient-to-r from-sky-500/12 via-sky-400/7 to-transparent text-slate-700",
    glow: "shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)]",
    selectedGlow: "shadow-[0_24px_48px_-30px_rgba(3,105,161,0.55)]",
  },
  logic: {
    border: "border-slate-200/90",
    borderSelected: "border-amber-300",
    bg: "bg-gradient-to-br from-white via-slate-50/95 to-amber-50/55",
    header:
      "bg-gradient-to-r from-amber-500/12 via-amber-400/7 to-transparent text-slate-700",
    glow: "shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)]",
    selectedGlow: "shadow-[0_24px_48px_-30px_rgba(180,83,9,0.52)]",
  },
  signal: {
    border: "border-slate-200/90",
    borderSelected: "border-emerald-300",
    bg: "bg-gradient-to-br from-white via-slate-50/95 to-emerald-50/55",
    header:
      "bg-gradient-to-r from-emerald-500/12 via-emerald-400/7 to-transparent text-slate-700",
    glow: "shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)]",
    selectedGlow: "shadow-[0_24px_48px_-30px_rgba(4,120,87,0.52)]",
  },
  risk: {
    border: "border-slate-200/90",
    borderSelected: "border-rose-300",
    bg: "bg-gradient-to-br from-white via-slate-50/95 to-rose-50/55",
    header:
      "bg-gradient-to-r from-rose-500/12 via-rose-400/7 to-transparent text-slate-700",
    glow: "shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)]",
    selectedGlow: "shadow-[0_24px_48px_-30px_rgba(190,24,93,0.52)]",
  },
};

export default function BaseNode({
  label,
  selected,
  category,
  children,
  hasError,
  blockType,
  validationMessage,
  helpLink,
  isMobileMode = false,
  isCompact = false,
  isExpanded = false,
  summary,
}: BaseNodeProps) {
  const styles = categoryStyles[category];
  const borderClass = selected ? styles.borderSelected : styles.border;
  const errorBorder = hasError ? "border-rose-400 ring-2 ring-rose-200/80" : "";
  const tooltip = blockType ? getTooltip(blockToGlossaryId(blockType)) : null;
  const showCompact = isCompact && !isExpanded;

  // Separate handles from content to ensure handles are always rendered
  const { handles, content } = separateHandlesAndContent(children);

  return (
    <div
      className={cn(
        "group relative overflow-visible rounded-2xl border-2 bg-white/85 backdrop-blur-sm transition-all duration-200",
        isMobileMode ? "min-w-[150px]" : "min-w-[120px]",
        borderClass,
        styles.bg,
        styles.glow,
        selected && styles.selectedGlow,
        selected && "-translate-y-0.5 ring-1 ring-slate-300/60",
        errorBorder
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_12%_6%,rgba(255,255,255,0.55),transparent_42%)]" />
      <div
        className={cn(
          "relative z-10 flex items-center justify-between gap-1 rounded-t-xl border-b border-slate-200/65 text-[11px] font-medium tracking-[0.01em]",
          isMobileMode ? "px-4 py-2" : "px-3 py-1.5",
          styles.header
        )}
        title={tooltip?.short}
      >
        <div className="flex items-center gap-1.5">
          {hasError && (
            <svg
              className="h-4 w-4 flex-shrink-0 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {/* Show summary in title when collapsed, otherwise show label */}
          <span className="text-[12px] font-semibold tracking-tight text-slate-800">
            {showCompact && summary ? summary : label}
          </span>
        </div>
        {blockType && (
          <InfoIcon
            tooltip={tooltip || undefined}
            className="flex-shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
          />
        )}
      </div>

      {/* Content area - only show when expanded */}
      {!showCompact && (content.length > 0 || validationMessage) && (
        <div
          className={cn(
            "relative z-10 text-[12px] font-medium leading-[1.45] tracking-[0.004em] text-slate-600 [&_.font-bold]:font-semibold [&_.font-mono]:font-semibold [&_.font-mono]:tracking-normal [&_.text-gray-600]:text-slate-600 [&_.text-gray-700]:text-slate-700 [&_.text-sm]:text-[12.5px] [&_.text-xs]:text-[11.5px]",
            isMobileMode ? "px-4 py-2.5" : "px-3 py-2.5"
          )}
        >
          {content}
          {validationMessage && (
            <div className="mt-1">
              <div className="text-[11.5px] font-medium text-rose-600">{validationMessage}</div>
              {helpLink && (
                <a
                  href={helpLink}
                  className="mt-1 inline-block text-[11.5px] font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Always render handles for React Flow edge connections */}
      {handles}
    </div>
  );
}
