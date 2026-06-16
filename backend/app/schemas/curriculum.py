from pydantic import BaseModel


class LessonResponse(BaseModel):
    id: str
    title: str
    description: str
    template_name: str
    difficulty: str
    order: int


class ModuleResponse(BaseModel):
    id: str
    title: str
    description: str
    order: int
    lessons: list[LessonResponse]


class CurriculumResponse(BaseModel):
    modules: list[ModuleResponse]
