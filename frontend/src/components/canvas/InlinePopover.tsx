"use client";

import { useMemo } from "react";
import { Node } from "@xyflow/react";
import { ValidationError } from "@/types/canvas";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
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
  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [selectedNodeId, nodes]
  );

  const isOpen = !!selectedNode;

  // Virtual anchor ref — Radix calls getBoundingClientRect() on each positioning cycle,
  // so a live getter naturally tracks the node as the canvas pans/zooms.
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
