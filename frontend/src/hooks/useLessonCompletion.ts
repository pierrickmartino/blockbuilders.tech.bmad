import { useEffect, useRef, useState } from "react";
import { LessonCompletionApiClient } from "@/lib/api/lesson-completion-client";
import type { BacktestStatus } from "@/types/backtest";

interface UseLessonCompletionOptions {
  strategyId: string;
  runId: string | null;
  status: BacktestStatus | null;
}

interface UseLessonCompletionResult {
  lessonId: string | null;
  completedAt: string | null;
}

/**
 * Fires POST /lesson-completion/record exactly once per runId when the run
 * reaches `completed` status. Non-critical: failures are swallowed so the
 * result page is never broken by a completion-recording error.
 */
export function useLessonCompletion({
  strategyId,
  runId,
  status,
}: UseLessonCompletionOptions): UseLessonCompletionResult {
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const firedRunIds = useRef(new Set<string>());

  useEffect(() => {
    if (!runId || status !== "completed") return;
    if (firedRunIds.current.has(runId)) return;

    firedRunIds.current.add(runId);

    LessonCompletionApiClient.record(strategyId)
      .then((res) => {
        setLessonId(res.lesson_id);
        setCompletedAt(res.completed_at);
      })
      .catch(() => {
        // Non-critical: completion recording must not break the result page
      });
  }, [strategyId, runId, status]);

  return { lessonId, completedAt };
}
