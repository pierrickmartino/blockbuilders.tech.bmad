"use client";

import { useState } from "react";
import { BLOCK_REGISTRY, BlockCategory, BlockMeta, ESSENTIAL_INDICATORS, IndicatorBlockType, PLAIN_LABEL_MAP } from "@/types/canvas";
import type { IndicatorMode } from "@/lib/block-library-storage";
import InfoIcon from "@/components/InfoIcon";
import { blockToGlossaryId, getTooltip } from "@/lib/tooltip-content";
import { cn } from "@/lib/utils";

interface BlockPaletteProps {
  onDragStart: (
    event: React.DragEvent,
    blockMeta: BlockMeta
  ) => void;
  isMobileMode?: boolean;
  indicatorMode: IndicatorMode;
  onToggleIndicatorMode: () => void;
}

const categories: { key: BlockCategory; label: string }[] = [
  { key: "input", label: "Inputs" },
  { key: "indicator", label: "Indicators" },
  { key: "logic", label: "Logic" },
  { key: "signal", label: "Signals" },
  { key: "risk", label: "Risk" },
];

// Mirror BaseNode's categoryStyles for consistent visual identity
const categoryStyles: Record<BlockCategory, {
  iconBg: string;
  iconColor: string;
  borderHover: string;
  badgeText: string;
  badgeBg: string;
  label: string;
}> = {
  input: {
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    borderHover: "hover:border-violet-300",
    badgeText: "text-violet-700",
    badgeBg: "bg-violet-50",
    label: "Input",
  },
  indicator: {
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    borderHover: "hover:border-sky-300",
    badgeText: "text-sky-700",
    badgeBg: "bg-sky-50",
    label: "Indicator",
  },
  logic: {
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    borderHover: "hover:border-amber-300",
    badgeText: "text-amber-700",
    badgeBg: "bg-amber-50",
    label: "Logic",
  },
  signal: {
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    borderHover: "hover:border-emerald-300",
    badgeText: "text-emerald-700",
    badgeBg: "bg-emerald-50",
    label: "Signal",
  },
  risk: {
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    borderHover: "hover:border-rose-300",
    badgeText: "text-rose-700",
    badgeBg: "bg-rose-50",
    label: "Risk",
  },
};

function CategoryIcon({ category }: { category: BlockCategory }) {
  if (category === "input") {
    return (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <rect x="2" y="10" width="2.5" height="4" rx="0.5" fill="currentColor" />
        <rect x="6.75" y="6" width="2.5" height="8" rx="0.5" fill="currentColor" />
        <rect x="11.5" y="2" width="2.5" height="12" rx="0.5" fill="currentColor" />
      </svg>
    );
  }
  if (category === "indicator") {
    return (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
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
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
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
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
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
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
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

export default function BlockPalette({ onDragStart, isMobileMode = false, indicatorMode, onToggleIndicatorMode }: BlockPaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<BlockCategory>>(
    new Set(categories.map((c) => c.key))
  );

  const toggleCategory = (category: BlockCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const essentials = new Set<string>(ESSENTIAL_INDICATORS);
  const blocksByCategory = categories.map((cat) => ({
    ...cat,
    blocks: BLOCK_REGISTRY.filter((b) => {
      if (b.category !== cat.key) return false;
      if (cat.key === "indicator" && indicatorMode === "essentials") {
        return essentials.has(b.type as IndicatorBlockType);
      }
      return true;
    }),
  }));

  return (
    <div className="h-full overflow-y-auto bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Block Palette</h3>
      <div className="space-y-3">
        {blocksByCategory.map(({ key, label, blocks }) => (
          <div key={key}>
            <button
              onClick={() => toggleCategory(key)}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <span>{label}</span>
              <span className="text-gray-400">
                {expandedCategories.has(key) ? "−" : "+"}
              </span>
            </button>
            {expandedCategories.has(key) && (
              <div className="mt-1 space-y-1.5 pl-1">
                {blocks.map((block) => {
                  const tooltip = getTooltip(blockToGlossaryId(block.type));
                  const plainLabel = indicatorMode === "essentials"
                    ? PLAIN_LABEL_MAP[block.type as IndicatorBlockType]
                    : undefined;
                  const styles = categoryStyles[block.category];
                  const displayLabel = plainLabel ?? block.label;
                  const subLabel = plainLabel ? block.label : block.description;

                  return (
                    <div
                      key={block.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, block)}
                      title={tooltip?.short || block.description}
                      className={cn(
                        "group cursor-grab rounded-xl border border-gray-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-150",
                        styles.borderHover,
                        "hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)]"
                      )}
                    >
                      {/* Header: icon + label + info + badge */}
                      <div className={cn(
                        "flex items-center gap-2",
                        isMobileMode ? "px-3 pt-2.5 pb-2" : "px-2.5 pt-2 pb-1.5"
                      )}>
                        <div className={cn(
                          "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md",
                          styles.iconBg,
                          styles.iconColor
                        )}>
                          <CategoryIcon category={block.category} />
                        </div>
                        <span className="flex-1 text-[11.5px] font-semibold leading-tight text-gray-900">
                          {displayLabel}
                        </span>
                        <InfoIcon
                          tooltip={tooltip || undefined}
                          className="flex-shrink-0 opacity-40 transition-opacity group-hover:opacity-70"
                        />
                        <span className={cn(
                          "flex-shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-medium",
                          styles.badgeBg,
                          styles.badgeText
                        )}>
                          {styles.label}
                        </span>
                      </div>
                      {/* Sub-label / description */}
                      {subLabel && (
                        <div className={cn(
                          "border-t border-gray-100 text-[10.5px] leading-[1.4] text-gray-500",
                          isMobileMode ? "px-3 py-1.5" : "px-2.5 py-1"
                        )}>
                          {subLabel}
                        </div>
                      )}
                    </div>
                  );
                })}
                {key === "indicator" && (
                  <button
                    onClick={onToggleIndicatorMode}
                    className="mt-1.5 w-full text-center text-[11px] text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {indicatorMode === "essentials" ? "Show all indicators" : "Show essentials only"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
