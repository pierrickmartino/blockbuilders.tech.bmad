"use client";

import { useEffect, useMemo } from "react";
import { Node } from "@xyflow/react";
import { ValidationError, BlockType, getBlockMeta } from "@/types/canvas";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ParameterForm from "./ParameterForm";

interface InlinePopoverProps {
  selectedNodeId: string | null;
  nodes: Node[];
  onParamsChange: (nodeId: string, params: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  validationErrors: ValidationError[];
  onClose: () => void;
  isMobileMode?: boolean;
}

export default function InlinePopover({
  selectedNodeId,
  nodes,
  onParamsChange,
  onDeleteNode,
  validationErrors,
  onClose,
  isMobileMode = false,
}: InlinePopoverProps) {
  const renderAsMobileSheet = isMobileMode;

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [selectedNodeId, nodes]
  );

  const isOpen = !!selectedNode;

  const blockLabel = useMemo(() => {
    if (!selectedNode?.type) return "Block";
    return getBlockMeta(selectedNode.type as BlockType)?.label ?? selectedNode.type;
  }, [selectedNode]);

  // Virtual anchor ref for desktop popover positioning
  const virtualRef = useMemo(() => {
    if (!selectedNodeId) return undefined;
    return {
      current: {
        getBoundingClientRect: () => {
          const el = document.querySelector(`[data-id="${selectedNodeId}"]`);
          if (el) return el.getBoundingClientRect();
          return new DOMRect(0, 0, 0, 0);
        },
      },
    };
  }, [selectedNodeId]);

  // Scroll active input into view when mobile keyboard changes the visual viewport
  useEffect(() => {
    if (!renderAsMobileSheet || !isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.closest("[data-mobile-sheet]")) {
        active.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    };

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [renderAsMobileSheet, isOpen]);

  // Mobile: bottom sheet
  if (renderAsMobileSheet) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          side="bottom"
          className="max-h-[50vh] overflow-y-auto p-0 rounded-t-xl [&>button]:z-20"
          data-mobile-sheet
        >
          <SheetHeader className="sticky top-0 z-10 bg-background border-b px-4 pr-14 pt-4 pb-3">
            <SheetTitle className="text-sm font-semibold text-left">
              {blockLabel}
            </SheetTitle>
          </SheetHeader>
          {selectedNode && (
            <ParameterForm
              node={selectedNode}
              onParamsChange={onParamsChange}
              onDeleteNode={onDeleteNode}
              validationErrors={validationErrors}
              isMobileMode
              compact
            />
          )}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop/tablet: popover anchored to the node
  return (
    <Popover open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <PopoverAnchor virtualRef={virtualRef} />
      <PopoverContent
        side="right"
        sideOffset={12}
        collisionPadding={16}
        className="w-[280px] max-h-[360px] overflow-y-auto p-0"
        onInteractOutside={onClose}
        onEscapeKeyDown={onClose}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {selectedNode && (
          <ParameterForm
            node={selectedNode}
            onParamsChange={onParamsChange}
            onDeleteNode={onDeleteNode}
            validationErrors={validationErrors}
            isMobileMode={isMobileMode}
            compact
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
