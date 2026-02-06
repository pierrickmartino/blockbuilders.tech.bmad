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
import { BLOCK_REGISTRY, BlockCategory, BlockMeta, BlockType } from "@/types/canvas";
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
}

const categories: { key: BlockCategory; label: string }[] = [
  { key: "input", label: "Data" }, // Renamed from "Inputs" per PRD
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

export default function BlockLibrarySheet({
  onDragStart,
  onAddNode,
  reactFlowInstance,
  isMobileMode,
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
        return (
          block.label.toLowerCase().includes(query) ||
          block.description.toLowerCase().includes(query) ||
          block.type.toLowerCase().includes(query)
        );
      })
    : BLOCK_REGISTRY;

  // Group filtered blocks by category
  const blocksByCategory = categories.map((cat) => ({
    ...cat,
    blocks: filteredBlocks.filter((b) => b.category === cat.key),
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

  // Render a block card
  const renderBlockCard = (block: BlockMeta, showFavoriteToggle = true) => {
    const tooltip = getTooltip(blockToGlossaryId(block.type));
    const isFavorite = isFavoriteBlock(block.type);

    return (
      <div
        key={block.type}
        draggable
        onDragStart={(e) => onDragStart(e, block)}
        onClick={() => handleBlockTap(block)}
        title={tooltip?.short || block.description}
        className={cn(
          "cursor-pointer rounded border text-xs font-medium transition-colors hover:opacity-80",
          isMobileMode ? "px-4 py-3" : "px-3 py-2",
          categoryColors[block.category]
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">{block.label}</div>
          <div className="flex items-center gap-1">
            {showFavoriteToggle && (
              <button
                onClick={(e) => handleFavoriteToggle(block.type, e)}
                className={cn(
                  "flex-shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors",
                  isFavorite ? "text-amber-600" : "text-gray-400"
                )}
                aria-label="Toggle favorite"
                aria-pressed={isFavorite}
              >
                <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
              </button>
            )}
            <InfoIcon tooltip={tooltip} className="flex-shrink-0" />
          </div>
        </div>
        <div className="mt-0.5 text-[10px] opacity-70">{block.description}</div>
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
            "rounded-full bg-white p-2 shadow-md hover:bg-gray-50 transition-colors",
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
        <SheetHeader className="sticky top-0 z-10 bg-white border-b px-4 pt-4 pb-3">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
            <div className="border-b bg-gray-50 px-4 py-3">
              <div className="mb-2 text-xs font-semibold text-gray-600">
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
                        "flex-shrink-0 cursor-pointer rounded border px-3 py-2 text-xs font-medium transition-colors hover:opacity-80",
                        categoryColors[blockMeta.category]
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="h-4 w-4 p-0 flex items-center justify-center bg-white/50"
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
                  <div className="mb-2 text-sm font-semibold text-gray-700">
                    {label}
                    <span className="ml-1.5 text-xs font-normal text-gray-500">
                      ({blocks.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {blocks.map((block) => renderBlockCard(block))}
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {filteredBlocks.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-500">
                No blocks found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
