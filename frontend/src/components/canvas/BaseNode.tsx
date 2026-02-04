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

// Glass morphism category styles with frosted glass effect
const categoryStyles = {
  input: {
    border: "border-white/40",
    borderSelected: "border-violet-400/80",
    bg: "bg-gradient-to-br from-white/70 via-white/50 to-violet-100/40",
    header: "bg-gradient-to-r from-violet-500/20 via-violet-400/10 to-white/5 text-violet-900",
    glow: "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12),0_4px_16px_-4px_rgba(139,92,246,0.08)]",
    selectedGlow: "shadow-[0_12px_40px_-8px_rgba(139,92,246,0.25),0_4px_20px_-4px_rgba(139,92,246,0.15)]",
  },
  indicator: {
    border: "border-white/40",
    borderSelected: "border-sky-400/80",
    bg: "bg-gradient-to-br from-white/70 via-white/50 to-sky-100/40",
    header: "bg-gradient-to-r from-sky-500/20 via-sky-400/10 to-white/5 text-sky-900",
    glow: "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12),0_4px_16px_-4px_rgba(14,165,233,0.08)]",
    selectedGlow: "shadow-[0_12px_40px_-8px_rgba(14,165,233,0.25),0_4px_20px_-4px_rgba(14,165,233,0.15)]",
  },
  logic: {
    border: "border-white/40",
    borderSelected: "border-amber-400/80",
    bg: "bg-gradient-to-br from-white/70 via-white/50 to-amber-100/40",
    header: "bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-white/5 text-amber-900",
    glow: "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12),0_4px_16px_-4px_rgba(245,158,11,0.08)]",
    selectedGlow: "shadow-[0_12px_40px_-8px_rgba(245,158,11,0.25),0_4px_20px_-4px_rgba(245,158,11,0.15)]",
  },
  signal: {
    border: "border-white/40",
    borderSelected: "border-emerald-400/80",
    bg: "bg-gradient-to-br from-white/70 via-white/50 to-emerald-100/40",
    header: "bg-gradient-to-r from-emerald-500/20 via-emerald-400/10 to-white/5 text-emerald-900",
    glow: "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12),0_4px_16px_-4px_rgba(16,185,129,0.08)]",
    selectedGlow: "shadow-[0_12px_40px_-8px_rgba(16,185,129,0.25),0_4px_20px_-4px_rgba(16,185,129,0.15)]",
  },
  risk: {
    border: "border-white/40",
    borderSelected: "border-rose-400/80",
    bg: "bg-gradient-to-br from-white/70 via-white/50 to-rose-100/40",
    header: "bg-gradient-to-r from-rose-500/20 via-rose-400/10 to-white/5 text-rose-900",
    glow: "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12),0_4px_16px_-4px_rgba(244,63,94,0.08)]",
    selectedGlow: "shadow-[0_12px_40px_-8px_rgba(244,63,94,0.25),0_4px_20px_-4px_rgba(244,63,94,0.15)]",
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
        "group relative overflow-visible rounded-2xl border backdrop-blur-xl transition-all duration-200",
        isMobileMode ? "min-w-[160px]" : "min-w-[140px]",
        borderClass,
        styles.bg,
        styles.glow,
        selected && styles.selectedGlow,
        selected && "-translate-y-1 ring-1 ring-white/50",
        errorBorder
      )}
    >
      {/* Light-catching top edge highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(135deg,rgba(255,255,255,0.4)_0%,transparent_40%,transparent_60%,rgba(255,255,255,0.1)_100%)]" />
      <div
        className={cn(
          "relative z-10 flex items-center justify-between gap-1.5 rounded-t-xl border-b border-white/30 text-[13px] font-semibold tracking-tight",
          isMobileMode ? "px-4 py-2.5" : "px-3.5 py-2",
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
          <span className="text-[13px] font-semibold tracking-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
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
            "relative z-10 text-[13px] font-medium leading-relaxed tracking-normal text-slate-700 [&_.font-bold]:font-semibold [&_.font-mono]:font-semibold [&_.text-gray-600]:text-slate-600 [&_.text-gray-700]:text-slate-700 [&_.text-sm]:text-[13px] [&_.text-xs]:text-[12px]",
            isMobileMode ? "px-4 py-3" : "px-3.5 py-2.5"
          )}
        >
          {content}
          {validationMessage && (
            <div className="mt-1.5">
              <div className="text-[12px] font-medium text-rose-600">{validationMessage}</div>
              {helpLink && (
                <a
                  href={helpLink}
                  className="mt-1 inline-block text-[12px] font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900"
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
