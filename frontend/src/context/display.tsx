"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { TimezoneMode } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY_TIMEZONE = "bb.display.timezone";
const STORAGE_KEY_MOBILE_CANVAS = "bb.display.mobileCanvasMode";

export type MobileCanvasMode = "auto" | "mobile" | "desktop";

interface DisplayContextType {
  timezone: TimezoneMode;
  setTimezone: (tz: TimezoneMode) => void;
  mobileCanvasMode: MobileCanvasMode;
  setMobileCanvasMode: (mode: MobileCanvasMode) => void;
  isMobileCanvasMode: boolean;
}

const DisplayContext = createContext<DisplayContextType | undefined>(undefined);

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<TimezoneMode>("local");
  const [mobileCanvasMode, setMobileCanvasModeState] =
    useState<MobileCanvasMode>("auto");
  const isMobileViewport = useIsMobile();

  // Compute mobile canvas mode based on setting and viewport
  const isMobileCanvasMode =
    mobileCanvasMode === "mobile" ||
    (mobileCanvasMode === "auto" && isMobileViewport);

  // Load timezone from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_TIMEZONE);
      if (stored === "utc" || stored === "local") {
        setTimezoneState(stored);
      }
    }
  }, []);

  // Load mobile canvas mode from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_MOBILE_CANVAS);
      if (stored === "auto" || stored === "mobile" || stored === "desktop") {
        setMobileCanvasModeState(stored);
      }
    }
  }, []);

  // Persist timezone to localStorage on change
  const setTimezone = useCallback((tz: TimezoneMode) => {
    setTimezoneState(tz);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_TIMEZONE, tz);
    }
  }, []);

  // Persist mobile canvas mode to localStorage on change
  const setMobileCanvasMode = useCallback((mode: MobileCanvasMode) => {
    setMobileCanvasModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_MOBILE_CANVAS, mode);
    }
  }, []);

  return (
    <DisplayContext.Provider
      value={{
        timezone,
        setTimezone,
        mobileCanvasMode,
        setMobileCanvasMode,
        isMobileCanvasMode,
      }}
    >
      {children}
    </DisplayContext.Provider>
  );
}

export function useDisplay(): DisplayContextType {
  const context = useContext(DisplayContext);
  if (context === undefined) {
    throw new Error("useDisplay must be used within a DisplayProvider");
  }
  return context;
}
