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
const STORAGE_KEY_THEME = "bb.display.theme";

export type MobileCanvasMode = "auto" | "mobile" | "desktop";
export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

interface DisplayContextType {
  timezone: TimezoneMode;
  setTimezone: (tz: TimezoneMode) => void;
  mobileCanvasMode: MobileCanvasMode;
  setMobileCanvasMode: (mode: MobileCanvasMode) => void;
  isMobileCanvasMode: boolean;
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const DisplayContext = createContext<DisplayContextType | undefined>(undefined);

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<TimezoneMode>("local");
  const [mobileCanvasMode, setMobileCanvasModeState] =
    useState<MobileCanvasMode>("auto");
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
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

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_THEME);
      if (stored === "system" || stored === "light" || stored === "dark") {
        setThemeState(stored);
      }
    }
  }, []);

  // Handle system preference when theme is "system"
  useEffect(() => {
    if (theme !== "system") {
      setResolvedTheme(theme);
      return;
    }

    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateResolvedTheme = () => {
      setResolvedTheme(mediaQuery.matches ? "dark" : "light");
    };

    updateResolvedTheme();
    mediaQuery.addEventListener("change", updateResolvedTheme);
    return () => mediaQuery.removeEventListener("change", updateResolvedTheme);
  }, [theme]);

  // Apply dark class to HTML element based on resolved theme
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (resolvedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [resolvedTheme]);

  // Persist theme to localStorage on change
  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_THEME, newTheme);
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
        theme,
        resolvedTheme,
        setTheme,
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
