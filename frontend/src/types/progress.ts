export interface MilestoneItem {
  key: string;
  label: string;
  done: boolean;
}

export interface MilestonesResponse {
  total: number;
  completed: number;
  items: MilestoneItem[];
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
  milestones: MilestonesResponse;
  achievements: AchievementsResponse;
  next_steps: string[];
}
