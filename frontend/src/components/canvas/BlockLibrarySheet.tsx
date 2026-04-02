"use client";

import { useState, useEffect, useCallback } from "react";
import type { Node, ReactFlowInstance } from "@xyflow/react";
import type { CanvasEdge } from "@/components/canvas/StrategyCanvas";
import { Search, X, Star, Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BLOCK_REGISTRY, BlockCategory, BlockMeta, BlockType, ESSENTIAL_INDICATORS, IndicatorBlockType, PLAIN_LABEL_MAP } from "@/types/canvas";
import type { IndicatorMode } from "@/lib/block-library-storage";
import {
  trackRecentBlock,
  getRecentBlocks,
  toggleFavoriteBlock,
  getFavoriteBlocks,
  isFavoriteBlock,
} from "@/lib/block-library-storage";
import { generateBlockId } from "@/lib/canvas-utils";
import InfoIcon from "@/components/InfoIcon";
import { blockToGlossaryId, getTooltip } from "@/lib/tooltip-content";
import { cn } from "@/lib/utils";

interface BlockLibrarySheetProps {
  onDragStart: (event: React.DragEvent, blockMeta: BlockMeta) => void;
  onAddNode: (node: Node) => void;
  reactFlowInstance: React.RefObject<ReactFlowInstance<Node, CanvasEdge> | null>;
  isMobileMode: boolean;
  indicatorMode: IndicatorMode;
  onToggleIndicatorMode: () => void;
}

const categories: { key: BlockCategory; label: string }[] = [
  { key: "input", label: "Data" }, // Renamed from "Inputs" per PRD
  { key: "indicator", label: "Indicators" },
  { key: "logic", label: "Logic" },
  { key: "signal", label: "Signals" },
  { key: "risk", label: "Risk" },
];

// Mirror BlockPalette's categoryStyles for consistent visual identity
const categoryStyles: Record<BlockCategory, {
  iconBg: string;
  iconColor: string;
  borderHover: string;
  badgeText: string;
  badgeBg: string;
  label: string;
  chipBg: string;
}> = {
  input: {
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
    iconColor: "text-violet-600 dark:text-violet-400",
    borderHover: "hover:border-violet-300 dark:hover:border-violet-600",
    badgeText: "text-violet-700 dark:text-violet-300",
    badgeBg: "bg-violet-50 dark:bg-violet-900/30",
    label: "Input",
    chipBg: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-300",
  },
  indicator: {
    iconBg: "bg-sky-100 dark:bg-sky-900/40",
    iconColor: "text-sky-600 dark:text-sky-400",
    borderHover: "hover:border-sky-300 dark:hover:border-sky-600",
    badgeText: "text-sky-700 dark:text-sky-300",
    badgeBg: "bg-sky-50 dark:bg-sky-900/30",
    label: "Indicator",
    chipBg: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-300",
  },
  logic: {
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderHover: "hover:border-amber-300 dark:hover:border-amber-600",
    badgeText: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-50 dark:bg-amber-900/30",
    label: "Logic",
    chipBg: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300",
  },
  signal: {
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    borderHover: "hover:border-emerald-300 dark:hover:border-emerald-600",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-50 dark:bg-emerald-900/30",
    label: "Signal",
    chipBg: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300",
  },
  risk: {
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
    iconColor: "text-rose-600 dark:text-rose-400",
    borderHover: "hover:border-rose-300 dark:hover:border-rose-600",
    badgeText: "text-rose-700 dark:text-rose-300",
    badgeBg: "bg-rose-50 dark:bg-rose-900/30",
    label: "Risk",
    chipBg: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-300",
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

export default function BlockLibrarySheet({
  onDragStart,
  onAddNode,
  reactFlowInstance,
  isMobileMode,
  indicatorMode,
  onToggleIndicatorMode,
}: BlockLibrarySheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentBlocks, setRecentBlocks] = useState<BlockType[]>([]);
  const [favoriteBlocks, setFavoriteBlocks] = useState<BlockType[]>([]);

  // Load recents and favorites from localStorage on mount
  useEffect(() => {
    setRecentBlocks(getRecentBlocks());
    setFavoriteBlocks(getFavoriteBlocks());
  }, []);

  // Reload favorites when sheet opens (in case changed elsewhere)
  useEffect(() => {
    if (isOpen) {
      setRecentBlocks(getRecentBlocks());
      setFavoriteBlocks(getFavoriteBlocks());
    }
  }, [isOpen]);

  // Filter blocks by search query
  const filteredBlocks = searchQuery
    ? BLOCK_REGISTRY.filter((block) => {
        const query = searchQuery.toLowerCase();
        const plainLabel = PLAIN_LABEL_MAP[block.type as IndicatorBlockType];
        return (
          block.label.toLowerCase().includes(query) ||
          block.description.toLowerCase().includes(query) ||
          block.type.toLowerCase().includes(query) ||
          (plainLabel && plainLabel.toLowerCase().includes(query))
        );
      })
    : BLOCK_REGISTRY;

  // Group filtered blocks by category (essentials filter bypassed during search)
  const essentials = new Set<string>(ESSENTIAL_INDICATORS);
  const blocksByCategory = categories.map((cat) => ({
    ...cat,
    blocks: filteredBlocks.filter((b) => {
      if (b.category !== cat.key) return false;
      if (!searchQuery && cat.key === "indicator" && indicatorMode === "essentials") {
        return essentials.has(b.type as IndicatorBlockType);
      }
      return true;
    }),
  }));

  // Get block meta for a block type
  const getBlockMeta = (blockType: BlockType): BlockMeta | undefined => {
    return BLOCK_REGISTRY.find((b) => b.type === blockType);
  };

  // Handle tap-to-place (click on block)
  const handleBlockTap = useCallback(
    (blockMeta: BlockMeta) => {
      if (!reactFlowInstance.current) return;

      // Get viewport center
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      // Add slight random offset to avoid perfect stacking
      position.x += Math.random() * 20 - 10;
      position.y += Math.random() * 20 - 10;

      // Create new node
      const newNode: Node = {
        id: generateBlockId(),
        type: blockMeta.type,
        position,
        data: {
          label: blockMeta.label,
          params: { ...blockMeta.defaultParams },
          blockType: blockMeta.type,
        },
      };

      // Add to canvas
      onAddNode(newNode);

      // Track as recent
      trackRecentBlock(blockMeta.type);
      setRecentBlocks(getRecentBlocks());

      // Close sheet
      setIsOpen(false);
    },
    [reactFlowInstance, onAddNode]
  );

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(
    (blockType: BlockType, event: React.MouseEvent) => {
      event.stopPropagation(); // Prevent block tap
      toggleFavoriteBlock(blockType);
      setFavoriteBlocks(getFavoriteBlocks());
    },
    []
  );

  // Render a block card — mirrors BlockPalette's card design
  const renderBlockCard = (block: BlockMeta, showFavoriteToggle = true) => {
    const tooltip = getTooltip(blockToGlossaryId(block.type));
    const isFavorite = isFavoriteBlock(block.type);
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
        onClick={() => handleBlockTap(block)}
        title={tooltip?.short || block.description}
        className={cn(
          "group cursor-pointer rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-150",
          styles.borderHover,
          "hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)]"
        )}
      >
        {/* Header: icon + label + favorite + badge */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <div className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md",
            styles.iconBg,
            styles.iconColor
          )}>
            <CategoryIcon category={block.category} />
          </div>
          <span className="flex-1 text-[12px] font-semibold leading-tight text-gray-900 dark:text-slate-100">
            {displayLabel}
          </span>
          {showFavoriteToggle && (
            <button
              onClick={(e) => handleFavoriteToggle(block.type, e)}
              className={cn(
                "flex-shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
                isFavorite ? "text-amber-500" : "text-gray-300 group-hover:text-gray-400 dark:text-slate-600 dark:group-hover:text-slate-400"
              )}
              aria-label="Toggle favorite"
              aria-pressed={isFavorite}
            >
              <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
            </button>
          )}
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
          <div className="border-t border-gray-100 dark:border-slate-700 px-3 py-1.5 text-[10.5px] leading-[1.4] text-gray-500 dark:text-slate-400">
            {subLabel}
          </div>
        )}
      </div>
    );
  };

  // Combine favorites and recents (max 8 total)
  const quickAccessBlocks: Array<{ type: BlockType; isFavorite: boolean }> = [
    ...favoriteBlocks.map((type) => ({ type, isFavorite: true })),
    ...recentBlocks
      .filter((type) => !favoriteBlocks.includes(type)) // Exclude already-favorited
      .map((type) => ({ type, isFavorite: false })),
  ].slice(0, 8);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "rounded-full bg-card dark:bg-card p-2 shadow-md hover:bg-accent dark:hover:bg-accent transition-colors text-foreground",
            "lg:hidden" // Only show on mobile
          )}
          aria-label="Open block library"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="max-h-[80vh] overflow-hidden p-0"
        aria-label="Block Library"
      >
        {/* Search Header */}
        <SheetHeader className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b px-4 pt-4 pb-3">
          <SheetTitle className="sr-only">Block Library</SheetTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search blocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
              aria-label="Search blocks"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 80px)" }}>
          {/* Recents/Favorites Strip */}
          {quickAccessBlocks.length > 0 && !searchQuery && (
            <div className="border-b border-border bg-muted px-4 py-3">
              <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-slate-400">
                Quick Access
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {quickAccessBlocks.map(({ type, isFavorite }) => {
                  const blockMeta = getBlockMeta(type);
                  if (!blockMeta) return null;

                  return (
                    <div
                      key={type}
                      draggable
                      onDragStart={(e) => onDragStart(e, blockMeta)}
                      onClick={() => handleBlockTap(blockMeta)}
                      className={cn(
                        "flex-shrink-0 cursor-pointer rounded-lg border px-3 py-2 text-[11.5px] font-semibold transition-colors hover:opacity-80",
                        categoryStyles[blockMeta.category].chipBg
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="h-4 w-4 p-0 flex items-center justify-center bg-white/50 dark:bg-black/30"
                        >
                          {isFavorite ? (
                            <Star className="h-2.5 w-2.5 fill-current text-amber-600" />
                          ) : (
                            <Clock className="h-2.5 w-2.5" />
                          )}
                        </Badge>
                        <span>{blockMeta.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categorized Blocks */}
          <div className="px-4 py-4 space-y-4">
            {blocksByCategory.map(({ key, label, blocks }) => {
              // Hide empty categories during search
              if (searchQuery && blocks.length === 0) return null;

              return (
                <div key={key}>
                  <div className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
                    {label}
                    <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-slate-400">
                      ({blocks.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {blocks.map((block) => renderBlockCard(block))}
                  </div>
                  {key === "indicator" && !searchQuery && (
                    <button
                      onClick={onToggleIndicatorMode}
                      className="mt-2 w-full text-center text-[11px] text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {indicatorMode === "essentials" ? "Show all indicators" : "Show essentials only"}
                    </button>
                  )}
                </div>
              );
            })}

            {/* Empty state */}
            {filteredBlocks.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-500 dark:text-slate-400">
                No blocks found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
