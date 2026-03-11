"use client";

import { useEffect, useMemo, useRef } from "react";
import StrategyCanvas from "./StrategyCanvas";
import { getCanvasFlags } from "@/lib/feature-flags";
import { trackEvent } from "@/lib/analytics";

export type { StrategyCanvasProps, CanvasEdge } from "./StrategyCanvas";
export { useCanvasActions } from "./StrategyCanvas";

type SmartCanvasProps = React.ComponentProps<typeof StrategyCanvas>;

export default function SmartCanvas(props: SmartCanvasProps) {
  const hasTrackedRef = useRef(false);

  const canvasFlags = useMemo(() => {
    const { flags, hadFallback } = getCanvasFlags();
    return { flags, hadFallback };
  }, []);

  useEffect(() => {
    if (hasTrackedRef.current) return;
    hasTrackedRef.current = true;
    trackEvent("smartcanvas_rendered");
    if (canvasFlags.hadFallback) {
      trackEvent("smartcanvas_flag_fallback_used");
    }
  }, [canvasFlags.hadFallback]);

  return <StrategyCanvas {...props} canvasFlags={canvasFlags.flags} />;
}
