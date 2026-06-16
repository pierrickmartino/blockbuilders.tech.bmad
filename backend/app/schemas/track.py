"""Schemas for the literacy track view."""
from pydantic import BaseModel


class TrackLesson(BaseModel):
    id: str
    title: str
    order: int
    completed: bool


class TrackModule(BaseModel):
    id: str
    title: str
    order: int
    lessons: list[TrackLesson]
    completed_count: int
    total_count: int
    percent_complete: float


class TrackView(BaseModel):
    modules: list[TrackModule]
    total_lessons: int
    completed_lessons: int
    percent_complete: float
    resume_lesson_id: str | None
