import type { PublicBacktestView } from "@/types/backtest";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

/**
 * Server-side loader for the public Shared backtest view (ADR-0019).
 * Returns null for missing, expired, or otherwise unreadable share tokens
 * so callers can render the existing not-found state.
 */
export async function getSharedBacktestView(
  token: string
): Promise<PublicBacktestView | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/backtests/share/${token}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as PublicBacktestView;
  } catch {
    return null;
  }
}
