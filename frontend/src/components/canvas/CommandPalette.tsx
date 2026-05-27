"use client";

import { useState, useMemo, useCallback } from "react";
import type { Node, ReactFlowInstance } from "@xyflow/react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DialogTitle } from "@/components/ui/dialog";
import { BLOCK_REGISTRY } from "@/types/canvas";
import type { BlockMeta } from "@/types/canvas";
import { categoryStyles } from "@/lib/category-styles";
import {
  getRecentBlocks,
  getFavoriteBlocks,
  trackRecentBlock,
} from "@/lib/block-library-storage";
import { generateBlockId } from "@/lib/canvas-utils";
import { trackEvent } from "@/lib/analytics";
import {
  buildCommandList,
  type PaletteCommand,
  type PaletteCommandGroup,
} from "@/lib/palette-commands";
import { computePaletteInsertPosition } from "@/lib/palette-position";
import type { CanvasEdge } from "@/components/canvas/StrategyCanvas";
import { useCanvasState } from "@/context/CanvasStateContext";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddNode: (node: Node) => void;
}

function CategoryChip({ category }: { category: BlockMeta["category"] }) {
  const style = categoryStyles[category];
  return (
    <span
      className={cn(
        "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        style.chipBg
      )}
    >
      {style.label}
    </span>
  );
}

function CategoryIconInline({ category }: { category: BlockMeta["category"] }) {
  const style = categoryStyles[category];
  return (
    <span
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded",
        style.iconBg,
        style.iconColor
      )}
      aria-hidden
    >
      {category === "input" && (
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
          <rect x="2" y="10" width="2.5" height="4" rx="0.5" fill="currentColor" />
          <rect x="6.75" y="6" width="2.5" height="8" rx="0.5" fill="currentColor" />
          <rect x="11.5" y="2" width="2.5" height="12" rx="0.5" fill="currentColor" />
        </svg>
      )}
      {category === "indicator" && (
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
          <polyline
            points="2,12 5,7 8,9 11,4 14,6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {category === "logic" && (
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
          <path
            d="M2 8h3M9 4l4 4-4 4M5 8c0-2 1.5-4 4-4M5 8c0 2 1.5 4 4 4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {category === "signal" && (
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
          <path
            d="M8 13V5M5 8l3-3 3 3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M3 13h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
      {category === "risk" && (
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
          <path
            d="M8 2L2.5 4.5V9c0 2.5 2.2 4.5 5.5 5 3.3-.5 5.5-2.5 5.5-5V4.5L8 2z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

export default function CommandPalette({
  open,
  onOpenChange,
  onAddNode,
}: CommandPaletteProps) {
  const { state } = useCanvasState();
  const reactFlowInstance = state.reactFlowInstance as ReactFlowInstance<Node, CanvasEdge> | null;
  const [query, setQuery] = useState("");

  const groups: PaletteCommandGroup[] = useMemo(
    () =>
      buildCommandList({
        registry: BLOCK_REGISTRY,
        recents: getRecentBlocks(),
        favorites: getFavoriteBlocks(),
        query,
      }),
    [query]
  );

  const totalResults = groups.reduce((sum, g) => sum + g.commands.length, 0);

  const handleSelect = useCallback(
    (cmd: PaletteCommand) => {
      if (!reactFlowInstance) return;

      const meta = BLOCK_REGISTRY.find((b) => b.type === cmd.blockType);
      if (!meta) return;

      const screenCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const position = computePaletteInsertPosition(
        (pt) => reactFlowInstance.screenToFlowPosition(pt),
        screenCenter
      );

      const newNode: Node = {
        id: generateBlockId(),
        type: meta.type,
        position,
        data: {
          label: meta.label,
          params: { ...meta.defaultParams },
          blockType: meta.type,
        },
      };

      onAddNode(newNode);
      trackRecentBlock(meta.type);
      trackEvent("bb.canvas.palette.inserted", {
        block_type: meta.type,
        category: meta.category,
        query,
        query_length: query.length,
        source: cmd.source,
      });

      onOpenChange(false);
      setQuery("");
    },
    [reactFlowInstance, onAddNode, onOpenChange, query]
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        trackEvent("bb.canvas.palette.dismissed", {
          had_query: query.length > 0,
          query_length: query.length,
          result_count: totalResults,
        });
        setQuery("");
      }
      onOpenChange(next);
    },
    [onOpenChange, query, totalResults]
  );

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <VisuallyHidden>
        <DialogTitle>Insert node</DialogTitle>
      </VisuallyHidden>
      <CommandInput
        placeholder="Search blocks…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          No nodes match &ldquo;{query}&rdquo;. Try &lsquo;rsi&rsquo;,
          &lsquo;moving average&rsquo;, or a category like &lsquo;indicator&rsquo;.
        </CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.groupLabel} heading={group.groupLabel}>
            {group.commands.map((cmd) => (
              <CommandItem
                key={`${group.groupLabel}-${cmd.blockType}`}
                value={cmd.blockType}
                keywords={cmd.keywords}
                onSelect={() => handleSelect(cmd)}
                className="flex items-center gap-2"
              >
                <CategoryIconInline category={cmd.category} />
                <span className="flex-1 text-sm">{cmd.label}</span>
                <CategoryChip category={cmd.category} />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {totalResults} result{totalResults !== 1 ? "s" : ""}
      </div>
    </CommandDialog>
  );
}
