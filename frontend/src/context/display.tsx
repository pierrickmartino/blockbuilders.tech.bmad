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

const STORAGE_KEY = "bb.display.timezone";

interface DisplayContextType {
  timezone: TimezoneMode;
  setTimezone: (tz: TimezoneMode) => void;
}

const DisplayContext = createContext<DisplayContextType | undefined>(undefined);

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<TimezoneMode>("local");

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "utc" || stored === "local") {
        setTimezoneState(stored);
      }
    }
  }, []);

  // Persist to localStorage on change
  const setTimezone = useCallback((tz: TimezoneMode) => {
    setTimezoneState(tz);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, tz);
    }
  }, []);

  return (
    <DisplayContext.Provider value={{ timezone, setTimezone }}>
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
