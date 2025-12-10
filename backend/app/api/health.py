from fastapi import APIRouter
from sqlmodel import text
from app.core.config import settings
from app.core.database import engine

router = APIRouter()


@router.get("/health")
def health_check():
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    return {
        "status": "ok",
        "db": db_status,
        "version": settings.app_version,
    }
