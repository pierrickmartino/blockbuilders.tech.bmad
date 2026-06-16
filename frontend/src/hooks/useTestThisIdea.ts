"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { StrategyTemplatesApiClient } from "@/lib/api/strategy-templates-client";
import { startAutoBacktest } from "@/lib/start-auto-backtest";

interface UseTestThisIdeaOptions {
  templateId: string | null;
  userId?: string;
}

interface UseTestThisIdeaResult {
  trigger: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Orchestrates the lesson "test this idea" flow:
 * clone template → enqueue 1-year auto-backtest → navigate-into-running.
 */
export function useTestThisIdea({
  templateId,
  userId,
}: UseTestThisIdeaOptions): UseTestThisIdeaResult {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(async () => {
    if (!templateId) return;

    setIsLoading(true);
    setError(null);

    try {
      const strategy = await StrategyTemplatesApiClient.clone(templateId);
      const { runId } = await startAutoBacktest({
        strategyId: strategy.id,
        entryPath: strategy.entry_path,
        source: "lesson_test_this_idea",
        userId,
      });
      router.push(`/strategies/${strategy.id}/backtest?run=${runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start backtest");
    } finally {
      setIsLoading(false);
    }
  }, [templateId, userId, router]);

  return { trigger, isLoading, error };
}
