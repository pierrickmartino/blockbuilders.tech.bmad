"use client";

import { useState, useEffect, useCallback } from "react";
import { trackEvent } from "@/lib/analytics";

type Trigger = "shortcut" | "chip-click";

interface UseCommandPaletteOptions {
  isMobileMode: boolean;
  nodeCount: number;
}

interface UseCommandPaletteReturn {
  open: boolean;
  setOpen: (open: boolean) => void;
  openWithTrigger: (trigger: Trigger) => void;
}

export function useCommandPalette({
  isMobileMode,
  nodeCount,
}: UseCommandPaletteOptions): UseCommandPaletteReturn {
  const [open, setOpen] = useState(false);

  const openWithTrigger = useCallback(
    (trigger: Trigger) => {
      if (isMobileMode) return;
      setOpen(true);
      trackEvent("bb.canvas.palette.opened", { trigger, node_count_on_canvas: nodeCount });
    },
    [isMobileMode, nodeCount]
  );

  useEffect(() => {
    if (isMobileMode) return;

    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openWithTrigger("shortcut");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMobileMode, openWithTrigger]);

  return { open, setOpen, openWithTrigger };
}
