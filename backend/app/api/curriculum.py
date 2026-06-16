from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.database import get_session
from app.data.curriculum_registry import CURRICULUM
from app.models.strategy_template import StrategyTemplate
from app.schemas.curriculum import CurriculumResponse, LessonResponse, ModuleResponse

router = APIRouter(prefix="/curriculum", tags=["curriculum"])


@router.get("", response_model=CurriculumResponse)
def get_curriculum(session: Session = Depends(get_session)) -> CurriculumResponse:
    """Return the static Literacy track curriculum (public, no auth required)."""
    templates = session.exec(
        select(StrategyTemplate).where(StrategyTemplate.status == "published")
    ).all()
    template_id_by_name = {t.name: str(t.id) for t in templates}

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
                        template_id=template_id_by_name.get(lesson["template_name"]),
                        difficulty=lesson["difficulty"],
                        order=lesson["order"],
                    )
                    for lesson in mod["lessons"]
                ],
            )
            for mod in CURRICULUM["modules"]
        ]
    )
