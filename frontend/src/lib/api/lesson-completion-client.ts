import { apiFetch } from "@/lib/api/internal/fetch";

export interface LessonCompletionResponse {
  lesson_id: string | null;
  completed_at: string | null;
}

export const LessonCompletionApiClient = {
  async record(strategyId: string): Promise<LessonCompletionResponse> {
    return apiFetch<LessonCompletionResponse>("/lesson-completion/record", {
      method: "POST",
      body: JSON.stringify({ strategy_id: strategyId }),
    });
  },
};
