export interface LessonItem {
  key: string;
  label: string;
  done: boolean;
}

export interface LessonsResponse {
  total: number;
  completed: number;
  items: LessonItem[];
}

export interface AchievementItem {
  key: string;
  label: string;
}

export interface AchievementsResponse {
  total: number;
  unlocked: number;
  latest: AchievementItem | null;
}

export interface ProgressResponse {
  strategies_count: number;
  strategy_versions_count: number;
  completed_backtests_count: number;
  lessons: LessonsResponse;
  achievements: AchievementsResponse;
  next_steps: string[];
}
