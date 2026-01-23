import { ReactNode } from "react";
import InfoIcon from "@/components/InfoIcon";
import { blockToGlossaryId, getTooltip } from "@/lib/tooltip-content";
import { cn } from "@/lib/utils";

interface BaseNodeProps {
  label: string;
  selected: boolean;
  category: "input" | "indicator" | "logic" | "signal" | "risk";
  children?: ReactNode;
  hasError?: boolean;
  blockType?: string;
  validationMessage?: string;
  helpLink?: string;
  isMobileMode?: boolean;
}

const categoryStyles = {
  input: {
    border: "border-purple-300 dark:border-purple-600",
    borderSelected: "border-purple-500 dark:border-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    header: "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300",
  },
  indicator: {
    border: "border-blue-300 dark:border-blue-600",
    borderSelected: "border-blue-500 dark:border-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    header: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
  },
  logic: {
    border: "border-amber-300 dark:border-amber-600",
    borderSelected: "border-amber-500 dark:border-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    header: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300",
  },
  signal: {
    border: "border-green-300 dark:border-green-600",
    borderSelected: "border-green-500 dark:border-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
    header: "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300",
  },
  risk: {
    border: "border-red-300 dark:border-red-600",
    borderSelected: "border-red-500 dark:border-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    header: "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300",
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
}: BaseNodeProps) {
  const styles = categoryStyles[category];
  const borderClass = selected ? styles.borderSelected : styles.border;
  const errorBorder = hasError ? "border-red-500 ring-2 ring-red-200 dark:ring-red-900/50" : "";
  const tooltip = blockType ? getTooltip(blockToGlossaryId(blockType)) : null;

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 shadow-sm",
        isMobileMode ? "min-w-[150px]" : "min-w-[120px]",
        borderClass,
        styles.bg,
        errorBorder
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-1 rounded-t-md text-xs font-semibold",
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
          <span>{label}</span>
        </div>
        {blockType && (
          <InfoIcon
            tooltip={tooltip || undefined}
            className="flex-shrink-0"
          />
        )}
      </div>
      {(children || validationMessage) && (
        <div className="px-3 py-2">
          {children}
          {validationMessage && (
            <div className="mt-1">
              <div className="text-xs text-red-600 dark:text-red-400">{validationMessage}</div>
              {helpLink && (
                <a
                  href={helpLink}
                  className="mt-1 inline-block text-xs text-red-700 underline hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
    </div>
  );
}
