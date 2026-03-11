"use client";

import { useEffect, useRef, useState } from "react";
import StrategyCanvas from "./StrategyCanvas";
import { getCanvasFlags } from "@/lib/feature-flags";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  ANALYTICS_POSTHOG_INITIALIZED_EVENT,
  trackEvent,
} from "@/lib/analytics";

export type { StrategyCanvasProps, CanvasEdge } from "./StrategyCanvas";
export { useCanvasActions } from "./StrategyCanvas";

type SmartCanvasProps = React.ComponentProps<typeof StrategyCanvas>;

export default function SmartCanvas(props: SmartCanvasProps) {
  const hasTrackedRef = useRef(false);
  const [canvasFlags, setCanvasFlags] = useState(() => getCanvasFlags());

  useEffect(() => {
    const refreshCanvasFlags = () => {
      setCanvasFlags((previous) => {
        const next = getCanvasFlags();
        if (previous.hadFallback !== next.hadFallback) return next;
        for (const key of Object.keys(previous.flags) as Array<
          keyof typeof previous.flags
        >) {
          if (previous.flags[key] !== next.flags[key]) return next;
        }
        return previous;
      });
    };

    // Re-read once after mount and whenever analytics lifecycle changes.
    refreshCanvasFlags();
    window.addEventListener(
      ANALYTICS_POSTHOG_INITIALIZED_EVENT,
      refreshCanvasFlags
    );
    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, refreshCanvasFlags);

    return () => {
      window.removeEventListener(
        ANALYTICS_POSTHOG_INITIALIZED_EVENT,
        refreshCanvasFlags
      );
      window.removeEventListener(
        ANALYTICS_CONSENT_CHANGED_EVENT,
        refreshCanvasFlags
      );
    };
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
