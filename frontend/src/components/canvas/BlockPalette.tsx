"use client";

import { useState } from "react";
import { BLOCK_REGISTRY, BlockCategory, BlockMeta } from "@/types/canvas";
import InfoIcon from "@/components/InfoIcon";
import { blockToGlossaryId, getTooltip } from "@/lib/tooltip-content";
import { cn } from "@/lib/utils";

interface BlockPaletteProps {
  onDragStart: (
    event: React.DragEvent,
    blockMeta: BlockMeta
  ) => void;
  isMobileMode?: boolean;
}

const categories: { key: BlockCategory; label: string }[] = [
  { key: "input", label: "Inputs" },
  { key: "indicator", label: "Indicators" },
  { key: "logic", label: "Logic" },
  { key: "signal", label: "Signals" },
  { key: "risk", label: "Risk" },
];

const categoryColors: Record<BlockCategory, string> = {
  input: "bg-purple-100 text-purple-700 border-purple-200",
  indicator: "bg-blue-100 text-blue-700 border-blue-200",
  logic: "bg-amber-100 text-amber-700 border-amber-200",
  signal: "bg-green-100 text-green-700 border-green-200",
  risk: "bg-red-100 text-red-700 border-red-200",
};

export default function BlockPalette({ onDragStart, isMobileMode = false }: BlockPaletteProps) {
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

  const blocksByCategory = categories.map((cat) => ({
    ...cat,
    blocks: BLOCK_REGISTRY.filter((b) => b.category === cat.key),
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
              <div className="mt-1 space-y-1 pl-2">
                {blocks.map((block) => {
                  const tooltip = getTooltip(blockToGlossaryId(block.type));
                  return (
                    <div
                      key={block.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, block)}
                      title={tooltip?.short || block.description}
                      className={cn(
                        "cursor-grab rounded border text-xs font-medium transition-colors hover:opacity-80",
                        isMobileMode ? "px-4 py-3" : "px-3 py-2",
                        categoryColors[block.category]
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>{block.label}</div>
                        <InfoIcon
                          tooltip={tooltip}
                          className="ml-1 flex-shrink-0"
                        />
                      </div>
                      <div className="mt-0.5 text-[10px] opacity-70">
                        {block.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
