"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Node } from "@xyflow/react";
// ESSENTIAL_INDICATORS constant is in canvas.ts; NON_ESSENTIAL derived inline here
import {
  getIndicatorMode,
  setIndicatorMode as persistMode,
  type IndicatorMode,
} from "@/lib/block-library-storage";
import { trackEvent } from "@/lib/analytics";

const NON_ESSENTIAL = new Set(["atr", "stochastic", "adx", "ichimoku", "obv", "fibonacci"]);

/**
 * Manages indicator palette mode (essentials vs all).
 * Handles localStorage persistence, legacy detection, and analytics.
 */
export function useIndicatorMode(nodes: Node[]): {
  mode: IndicatorMode;
  toggle: () => void;
} {
  // Lazy initializer reads from localStorage synchronously (no effect needed)
  const [mode, setMode] = useState<IndicatorMode>(() => getIndicatorMode() ?? "essentials");
  const legacyChecked = useRef(false);

  // Legacy detection: if no stored preference and current strategy has non-essential indicators
  useEffect(() => {
    if (legacyChecked.current || nodes.length === 0) return;
    if (getIndicatorMode() !== null) {
      legacyChecked.current = true;
      return;
    }
    const hasNonEssential = nodes.some((n) => {
      const bt = (n.data?.blockType as string) ?? "";
      return NON_ESSENTIAL.has(bt);
    });
    if (hasNonEssential) setMode("all");
    legacyChecked.current = true;
  }, [nodes]);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next: IndicatorMode = prev === "essentials" ? "all" : "essentials";
      persistMode(next);
      trackEvent("palette_mode_changed", { mode: next });
      return next;
    });
  }, []);

  return { mode, toggle };
}
