from fastapi import APIRouter

from app.data.curriculum_registry import CURRICULUM
from app.schemas.curriculum import CurriculumResponse, LessonResponse, ModuleResponse

router = APIRouter(prefix="/curriculum", tags=["curriculum"])


@router.get("", response_model=CurriculumResponse)
def get_curriculum() -> CurriculumResponse:
    """Return the static Literacy track curriculum (public, no auth required)."""
    return CurriculumResponse(
        modules=[
            ModuleResponse(
                id=mod["id"],
                title=mod["title"],
                description=mod["description"],
                order=mod["order"],
                lessons=[
                    LessonResponse(
                        id=lesson["id"],
                        title=lesson["title"],
                        description=lesson["description"],
                        template_name=lesson["template_name"],
                        difficulty=lesson["difficulty"],
                        order=lesson["order"],
                    )
                    for lesson in mod["lessons"]
                ],
            )
            for mod in CURRICULUM["modules"]
        ]
    )
