from pydantic import BaseModel


class LessonItem(BaseModel):
    key: str
    label: str
    done: bool


class LessonsResponse(BaseModel):
    total: int
    completed: int
    items: list[LessonItem]


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
    lessons: LessonsResponse
    achievements: AchievementsResponse
    next_steps: list[str]
