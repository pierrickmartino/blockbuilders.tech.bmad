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
    if (isValidElement(child) && child.type === Handle) {
      handles.push(child);
    } else {
      content.push(child);
    }
  });

  return { handles, content };
}

function CategoryIcon({ category }: { category: string }) {
  if (category === "input") {
    return (
      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
        <rect x="2" y="10" width="2.5" height="4" rx="0.5" fill="currentColor" />
        <rect x="6.75" y="6" width="2.5" height="8" rx="0.5" fill="currentColor" />
        <rect x="11.5" y="2" width="2.5" height="12" rx="0.5" fill="currentColor" />
      </svg>
    );
  }
  if (category === "indicator") {
    return (
      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
        <polyline
          points="2,12 5,7 8,9 11,4 14,6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (category === "logic") {
    return (
      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
        <path
          d="M2 8h3M9 4l4 4-4 4M5 8c0-2 1.5-4 4-4M5 8c0 2 1.5 4 4 4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (category === "signal") {
    return (
      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
        <path
          d="M8 13V5M5 8l3-3 3 3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M3 13h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (category === "risk") {
    return (
      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
        <path
          d="M8 2L2.5 4.5V9c0 2.5 2.2 4.5 5.5 5 3.3-.5 5.5-2.5 5.5-5V4.5L8 2z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return null;
}

const categoryStyles = {
  input: {
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    border: "border-gray-200",
    borderSelected: "border-violet-400",
    ringSelected: "ring-1 ring-violet-200",
    badgeText: "text-violet-700",
    badgeBg: "bg-violet-50",
    label: "Input",
    selectedShadow: "shadow-[0_4px_16px_rgba(109,40,217,0.12)]",
  },
  indicator: {
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    border: "border-gray-200",
    borderSelected: "border-sky-400",
    ringSelected: "ring-1 ring-sky-200",
    badgeText: "text-sky-700",
    badgeBg: "bg-sky-50",
    label: "Indicator",
    selectedShadow: "shadow-[0_4px_16px_rgba(2,132,199,0.12)]",
  },
  logic: {
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    border: "border-gray-200",
    borderSelected: "border-amber-400",
    ringSelected: "ring-1 ring-amber-200",
    badgeText: "text-amber-700",
    badgeBg: "bg-amber-50",
    label: "Logic",
    selectedShadow: "shadow-[0_4px_16px_rgba(217,119,6,0.12)]",
  },
  signal: {
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    border: "border-gray-200",
    borderSelected: "border-emerald-400",
    ringSelected: "ring-1 ring-emerald-200",
    badgeText: "text-emerald-700",
    badgeBg: "bg-emerald-50",
    label: "Signal",
    selectedShadow: "shadow-[0_4px_16px_rgba(5,150,105,0.12)]",
  },
  risk: {
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    border: "border-gray-200",
    borderSelected: "border-rose-400",
    ringSelected: "ring-1 ring-rose-200",
    badgeText: "text-rose-700",
    badgeBg: "bg-rose-50",
    label: "Risk",
    selectedShadow: "shadow-[0_4px_16px_rgba(225,29,72,0.12)]",
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
  const tooltip = blockType ? getTooltip(blockToGlossaryId(blockType)) : null;
  const showCompact = isCompact && !isExpanded;
  const { handles, content } = separateHandlesAndContent(children);
  const displayLabel = showCompact && summary ? summary : label;
  const glossaryTooltip = tooltip?.long || tooltip?.short;
  const headerTitle = glossaryTooltip || (showCompact ? label : undefined);

  return (
    <div
      className={cn(
        "group relative overflow-visible rounded-xl border bg-white transition-all duration-150",
        isMobileMode ? "min-w-[170px]" : "min-w-[150px]",
        hasError
          ? "border-rose-400 ring-1 ring-rose-200"
          : selected
            ? cn(styles.borderSelected, styles.ringSelected)
            : styles.border,
        selected ? styles.selectedShadow : "shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
      )}
    >
      {/* Header row: icon + label + category badge */}
      <div
        className={cn(
          "flex items-center gap-2",
          isMobileMode ? "px-3.5 pt-3 pb-2.5" : "px-3 pt-2.5 pb-2",
          showCompact && "pb-2.5"
        )}
      >
        {/* Category icon */}
        <div
          className={cn(
            "flex flex-shrink-0 items-center justify-center rounded-lg",
            isMobileMode ? "h-8 w-8" : "h-7 w-7",
            hasError ? "bg-rose-100 text-rose-600" : cn(styles.iconBg, styles.iconColor)
          )}
        >
          {hasError ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <CategoryIcon category={category} />
          )}
        </div>

        {/* Title */}
        <span
          className={cn(
            "flex-1 font-semibold leading-tight text-gray-900",
            isMobileMode ? "text-[13px]" : "text-[12px]"
          )}
          title={headerTitle}
        >
          {displayLabel}
        </span>

        {/* Info icon */}
        {blockType && !showCompact && (
          <InfoIcon
            tooltip={tooltip || undefined}
            className="flex-shrink-0 opacity-40 transition-opacity group-hover:opacity-70"
          />
        )}

        {/* Category badge */}
        <span
          className={cn(
            "flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
            styles.badgeBg,
            styles.badgeText
          )}
        >
          {styles.label}
        </span>
      </div>

      {/* Content / params */}
      {!showCompact && (content.length > 0 || validationMessage) && (
        <div
          className={cn(
            "border-t border-gray-100 text-[11.5px] leading-[1.5] text-gray-500 [&_.font-bold]:font-semibold [&_.font-mono]:font-mono [&_.font-mono]:tracking-tight [&_.text-gray-600]:text-gray-500 [&_.text-gray-700]:text-gray-600 [&_.text-sm]:text-[12px] [&_.text-xs]:text-[11.5px]",
            isMobileMode ? "px-3.5 py-2" : "px-3 py-1.5"
          )}
        >
          {content}
          {validationMessage && (
            <div className="mt-1 text-[11px] font-medium text-rose-600">
              {validationMessage}
              {helpLink && (
                <a
                  href={helpLink}
                  className="ml-1 underline decoration-rose-300 underline-offset-2 hover:text-rose-800"
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
