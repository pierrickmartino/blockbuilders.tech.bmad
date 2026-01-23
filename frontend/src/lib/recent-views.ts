/**
 * Client-side storage for tracking recently viewed strategies and backtests.
 * Uses sessionStorage with localStorage fallback.
 */

const RECENT_STRATEGIES_KEY = "bb.recent.strategies";
const RECENT_BACKTESTS_KEY = "bb.recent.backtests";
const MAX_RECENT_ITEMS = 5;

export interface RecentBacktest {
  strategyId: string;
  runId?: string;
}

/**
 * Get storage instance (sessionStorage preferred, localStorage fallback).
 * Returns null if unavailable (SSR or disabled).
 */
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    // Try sessionStorage first
    if (sessionStorage) {
      sessionStorage.setItem("__test__", "1");
      sessionStorage.removeItem("__test__");
      return sessionStorage;
    }
  } catch {
    // Fallback to localStorage
    try {
      if (localStorage) {
        localStorage.setItem("__test__", "1");
        localStorage.removeItem("__test__");
        return localStorage;
      }
    } catch {
      // Both unavailable
    }
  }
  return null;
}

/**
 * Track a strategy view. Moves existing item to top if already present.
 */
export function trackStrategyView(strategyId: string): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const data = storage.getItem(RECENT_STRATEGIES_KEY);
    let recent: string[] = data ? JSON.parse(data) : [];

    // Remove if already exists (will be added to top)
    recent = recent.filter((id) => id !== strategyId);

    // Add to top and cap at max
    recent = [strategyId, ...recent].slice(0, MAX_RECENT_ITEMS);

    storage.setItem(RECENT_STRATEGIES_KEY, JSON.stringify(recent));
  } catch (err) {
    console.error("Failed to track strategy view:", err);
  }
}

/**
 * Track a backtest view. Moves existing item to top if already present.
 */
export function trackBacktestView(strategyId: string, runId?: string): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const data = storage.getItem(RECENT_BACKTESTS_KEY);
    let recent: RecentBacktest[] = data ? JSON.parse(data) : [];

    // Remove if already exists (will be added to top)
    recent = recent.filter(
      (item) => !(item.strategyId === strategyId && item.runId === runId)
    );

    // Add to top and cap at max
    recent = [{ strategyId, runId }, ...recent].slice(0, MAX_RECENT_ITEMS);

    storage.setItem(RECENT_BACKTESTS_KEY, JSON.stringify(recent));
  } catch (err) {
    console.error("Failed to track backtest view:", err);
  }
}

/**
 * Get recently viewed strategy IDs (up to 5).
 */
export function getRecentStrategies(): string[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const data = storage.getItem(RECENT_STRATEGIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Failed to get recent strategies:", err);
    // Clear corrupted data
    try {
      storage.removeItem(RECENT_STRATEGIES_KEY);
    } catch {
      // Ignore cleanup errors
    }
    return [];
  }
}

/**
 * Get recently viewed backtest references (up to 5).
 */
export function getRecentBacktests(): RecentBacktest[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const data = storage.getItem(RECENT_BACKTESTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Failed to get recent backtests:", err);
    // Clear corrupted data
    try {
      storage.removeItem(RECENT_BACKTESTS_KEY);
    } catch {
      // Ignore cleanup errors
    }
    return [];
  }
}
