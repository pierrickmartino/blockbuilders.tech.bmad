/**
 * Client-side storage for tracking recently used and favorite blocks.
 * Uses localStorage for persistence across sessions.
 */

import { BlockType } from "@/types/canvas";

const RECENT_BLOCKS_KEY = "bb.canvas.recent-blocks";
const FAVORITE_BLOCKS_KEY = "bb.canvas.favorite-blocks";
const INDICATOR_MODE_KEY = "bb.canvas.palette_indicator_mode";
const MAX_RECENT_BLOCKS = 8;

export type IndicatorMode = "essentials" | "all";

/**
 * Get storage instance (localStorage with availability check).
 * Returns null if unavailable (SSR or disabled).
 */
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    if (localStorage) {
      localStorage.setItem("__test__", "1");
      localStorage.removeItem("__test__");
      return localStorage;
    }
  } catch {
    // localStorage unavailable or disabled
  }
  return null;
}

/**
 * Track a block usage. Moves existing item to top if already present.
 * Only tracks when block is actually placed on canvas (tap-to-place).
 */
export function trackRecentBlock(blockType: BlockType): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const data = storage.getItem(RECENT_BLOCKS_KEY);
    let recent: BlockType[] = data ? JSON.parse(data) : [];

    // Remove if already exists (will be added to top)
    recent = recent.filter((type) => type !== blockType);

    // Add to top and cap at max
    recent = [blockType, ...recent].slice(0, MAX_RECENT_BLOCKS);

    storage.setItem(RECENT_BLOCKS_KEY, JSON.stringify(recent));
  } catch (err) {
    console.error("Failed to track recent block:", err);
  }
}

/**
 * Get recently used block types (up to 8).
 */
export function getRecentBlocks(): BlockType[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const data = storage.getItem(RECENT_BLOCKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Failed to get recent blocks:", err);
    // Clear corrupted data
    try {
      storage.removeItem(RECENT_BLOCKS_KEY);
    } catch {
      // Ignore cleanup errors
    }
    return [];
  }
}

/**
 * Toggle a block as favorite. Adds if not present, removes if present.
 */
export function toggleFavoriteBlock(blockType: BlockType): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const data = storage.getItem(FAVORITE_BLOCKS_KEY);
    let favorites: BlockType[] = data ? JSON.parse(data) : [];

    // Toggle: remove if present, add if not
    const index = favorites.indexOf(blockType);
    if (index >= 0) {
      favorites = favorites.filter((type) => type !== blockType);
    } else {
      favorites.push(blockType);
    }

    storage.setItem(FAVORITE_BLOCKS_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.error("Failed to toggle favorite block:", err);
  }
}

/**
 * Get favorite block types.
 */
export function getFavoriteBlocks(): BlockType[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const data = storage.getItem(FAVORITE_BLOCKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Failed to get favorite blocks:", err);
    // Clear corrupted data
    try {
      storage.removeItem(FAVORITE_BLOCKS_KEY);
    } catch {
      // Ignore cleanup errors
    }
    return [];
  }
}

/**
 * Check if a block is favorited.
 */
export function isFavoriteBlock(blockType: BlockType): boolean {
  const favorites = getFavoriteBlocks();
  return favorites.includes(blockType);
}

/**
 * Get the stored indicator palette mode. Returns null if not yet set.
 */
export function getIndicatorMode(): IndicatorMode | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const val = storage.getItem(INDICATOR_MODE_KEY);
    if (val === "essentials" || val === "all") return val;
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist indicator palette mode to localStorage.
 */
export function setIndicatorMode(mode: IndicatorMode): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(INDICATOR_MODE_KEY, mode);
  } catch {
    // Storage unavailable — mode stays in-memory only
  }
}
