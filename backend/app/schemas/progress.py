from pydantic import BaseModel


class MilestoneItem(BaseModel):
    key: str
    label: str
    done: bool


class MilestonesResponse(BaseModel):
    total: int
    completed: int
    items: list[MilestoneItem]


class AchievementItem(BaseModel):
    key: str
    label: str


class AchievementsResponse(BaseModel):
    total: int
    unlocked: int
    latest: AchievementItem | None


class ProgressResponse(BaseModel):
    strategies_count: int
    strategy_versions_count: int
    completed_backtests_count: int
    milestones: MilestonesResponse
    achievements: AchievementsResponse
    next_steps: list[str]
